/**
 * BluetoothPrinter.ts
 * A professional UNIVERSAL ESC/POS driver for thermal printers using Web Bluetooth.
 * Supports multiple common vendor UUIDs.
 */

export interface PrinterDevice {
    name: string;
    device: any;
    server: any;
    characteristic: any;
}

class BluetoothPrinterService {
    private device: any = null;
    private characteristic: any = null;

    // List of common Thermal Printer Service UUIDs
    private COMMON_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard
        '0000ff00-0000-1000-8000-00805f9b34fb', // Common 1
        '0000ae30-0000-1000-8000-00805f9b34fb', // Chinese models
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC High Speed
        '0000fee7-0000-1000-8000-00805f9b34fb', // Some generic models
        '0000af30-0000-1000-8000-00805f9b34fb', // Additional models
    ];

    // ESC/POS Commands
    private COMMANDS = {
        INIT: new Uint8Array([0x1B, 0x40]),
        BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
        BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
        ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
        ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
        ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
        FEED_CUT: new Uint8Array([0x1D, 0x56, 0x41, 0x10]), // Feed and Cut
        LARGE_TEXT: new Uint8Array([0x1D, 0x21, 0x11]), // Double width and height
        DOUBLE_SIZE: new Uint8Array([0x1D, 0x21, 0x11]), // Double width and height
        NORMAL_TEXT: new Uint8Array([0x1D, 0x21, 0x00]),
    };

    /**
     * Connect to any compatible Bluetooth Printer
     */
    async connect(): Promise<string> {
        try {
            if (!(navigator as any).bluetooth) {
                // Check if this is a Median App
                const isMedian = navigator.userAgent.includes('Median');
                if (isMedian) {
                    throw new Error('Median App detected. Please ensure the "Web Bluetooth" plugin is enabled in your Median.co dashboard.');
                }
                throw new Error('Bluetooth not supported on this browser.');
            }

            console.log("Starting printer discovery with shared services...");
            
            this.device = await (navigator as any).bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: this.COMMON_SERVICES
            });

            console.log('Connecting to GATT Server...');
            const server = await this.device.gatt.connect();

            // Attempt to find any of our known services
            let service = null;
            
            for (const uuid of this.COMMON_SERVICES) {
                try {
                    service = await server.getPrimaryService(uuid);
                    if (service) {
                        console.log('Found compatible service:', uuid);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!service) {
                // If not found in our list, try to get all services (might fail on some browsers)
                try {
                    const services = await server.getPrimaryServices();
                    if (services.length > 0) {
                        service = services[0];
                        console.log('Using first available service:', service.uuid);
                    }
                } catch (e) {
                    throw new Error('No compatible print service found on this device.');
                }
            }

            // Attempt to find the write characteristic
            const characteristics = await service.getCharacteristics();
            // Look for "Write" property
            this.characteristic = characteristics.find((c: any) => 
                c.properties.write || c.properties.writeWithoutResponse
            );

            if (!this.characteristic) {
                throw new Error('No write characteristic found. This device might not be a printer.');
            }

            console.log('Printer Connected and Verified:', this.device.name);
            return this.device.name || 'Thermal Printer';
        } catch (error: any) {
            console.error('Universal Connection failed:', error);
            throw error;
        }
    }

    /**
     * Send raw data in chunks (Printers often have small buffers)
     */
    private async write(data: Uint8Array) {
        if (!this.characteristic) {
            // Check if device is still connected
            if (this.device && this.device.gatt.connected) {
                // Try to re-fetch characteristic? Usually lost session means re-connect.
                throw new Error('Printer session lost. Please reconnect.');
            }
            throw new Error('Printer not connected');
        }
        
        const CHUNK_SIZE = 20; // Safe chunk size for Bluetooth LE
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            if (this.characteristic.properties.writeWithoutResponse) {
                await this.characteristic.writeValueWithoutResponse(chunk);
            } else {
                await this.characteristic.writeValue(chunk);
            }
        }
    }

    /**
     * Print a Ticket
     */
    async printTicket(data: {
        id: string;
        date: string;
        items: any[];
        total: number;
        mobile?: string;
        paymentMode?: string;
    }) {
        const encoder = new TextEncoder();
        
        try {
            // 1. Initialize
            await this.write(this.COMMANDS.INIT);
            
            // 2. Header
            await this.write(this.COMMANDS.ALIGN_CENTER);
            await this.write(this.COMMANDS.LARGE_TEXT);
            await this.write(encoder.encode("ETHREE\n"));
            await this.write(this.COMMANDS.NORMAL_TEXT);
            await this.write(encoder.encode("Eat. Enjoy. Entertain\n"));
            await this.write(encoder.encode("--------------------------------\n"));

            // 3. Details
            await this.write(this.COMMANDS.ALIGN_LEFT);
            await this.write(encoder.encode(`ID: ${data.id}\n`));
            await this.write(encoder.encode(`Date: ${data.date}\n`));
            if (data.mobile) await this.write(encoder.encode(`Mobile: ${data.mobile}\n`));
            await this.write(encoder.encode("--------------------------------\n"));

            // 4. Items
            for (const item of data.items) {
                const name = item.name.toUpperCase().substring(0, 18);
                const isCombo = name.includes('COMBO');
                
                const line = `${name.padEnd(20)} x${item.quantity}\n`;
                await this.write(encoder.encode(line));
                
                // Hide price for individual combo coupons
                if (!isCombo) {
                    await this.write(encoder.encode(`Price: INR ${item.price * item.quantity}\n`));
                }
            }

            // 5. Total
            // Only show total if NOT a combo coupon (Combos are usually pre-paid/fixed)
            const containsCombo = data.items.some(i => i.name.toUpperCase().includes('COMBO'));
            
            await this.write(encoder.encode("--------------------------------\n"));
            if (!containsCombo) {
                await this.write(this.COMMANDS.BOLD_ON);
                await this.write(encoder.encode(`TOTAL PAYABLE: INR ${data.total}\n`));
                await this.write(this.COMMANDS.BOLD_OFF);
            }
            
            // 6. Prominent Payment Mode (HIGHLIGHTED)
            if (data.paymentMode) {
                await this.write(this.COMMANDS.ALIGN_CENTER);
                await this.write(this.COMMANDS.DOUBLE_SIZE);
                await this.write(encoder.encode(`\n*** ${data.paymentMode.toUpperCase()} ***\n`));
                await this.write(this.COMMANDS.NORMAL_TEXT);
            }
            
            // 7. Footer
            await this.write(this.COMMANDS.ALIGN_CENTER);
            await this.write(encoder.encode("\nWWW.ETHREE.IN\n"));
            await this.write(encoder.encode("Support: +91 70369 23456\n"));
            await this.write(encoder.encode("Thank You! Visit Again\n"));
            
            // 7. Cut
            await this.write(new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A])); // Line feeds
            await this.write(this.COMMANDS.FEED_CUT);
        } catch (e) {
            console.error("Print execution failed", e);
            throw e;
        }
    }

    get isConnected() {
        return this.device && this.device.gatt.connected && this.characteristic;
    }
}

export const BluetoothPrinter = new BluetoothPrinterService();
