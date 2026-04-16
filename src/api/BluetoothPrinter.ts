/**
 * BluetoothPrinter.ts
 * A professional ESC/POS driver for thermal printers using Web Bluetooth.
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

    // Standard Thermal Printer UUIDs
    private SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
    private CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

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
        NORMAL_TEXT: new Uint8Array([0x1D, 0x21, 0x00]),
    };

    /**
     * Connect to a Bluetooth Printer
     */
    async connect(): Promise<string> {
        try {
            if (!(navigator as any).bluetooth) {
                throw new Error('Bluetooth not supported on this browser.');
            }

            this.device = await (navigator as any).bluetooth.requestDevice({
                filters: [
                    { services: [this.SERVICE_UUID] },
                    { vendorId: 0x0fe6 } // Common thermal printer vendor
                ],
                optionalServices: [this.SERVICE_UUID, '0000180a-0000-1000-8000-00805f9b34fb']
            }).catch(async () => {
                // Fallback for generic devices
                return await (navigator as any).bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [this.SERVICE_UUID]
                });
            });

            const server = await this.device.gatt.connect();
            const service = await server.getPrimaryService(this.SERVICE_UUID);
            this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

            console.log('Printer Connected:', this.device.name);
            return this.device.name || 'Thermal Printer';
        } catch (error: any) {
            console.error('Connection failed:', error);
            throw error;
        }
    }

    /**
     * Send raw data in chunks (Printers often have small buffers)
     */
    private async write(data: Uint8Array) {
        if (!this.characteristic) throw new Error('Printer not connected');
        
        const CHUNK_SIZE = 20; // Safe chunk size for Bluetooth LE
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            await this.characteristic.writeValue(chunk);
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
            const line = `${item.name.padEnd(20)} x${item.quantity}\n`;
            await this.write(encoder.encode(line));
            await this.write(encoder.encode(`Price: INR ${item.price * item.quantity}\n`));
        }

        // 5. Total
        await this.write(encoder.encode("--------------------------------\n"));
        await this.write(this.COMMANDS.BOLD_ON);
        await this.write(encoder.encode(`TOTAL PAYABLE: INR ${data.total}\n`));
        await this.write(this.COMMANDS.BOLD_OFF);
        if (data.paymentMode) await this.write(encoder.encode(`Mode: ${data.paymentMode.toUpperCase()}\n`));
        
        // 6. Footer
        await this.write(this.COMMANDS.ALIGN_CENTER);
        await this.write(encoder.encode("\nWWW.ETHREE.IN\n"));
        await this.write(encoder.encode("Thank You! Visit Again\n"));
        
        // 7. Cut
        await this.write(new Uint8Array([0x0A, 0x0A, 0x0A])); // Line feeds
        await this.write(this.COMMANDS.FEED_CUT);
    }

    get isConnected() {
        return this.device && this.device.gatt.connected;
    }
}

export const BluetoothPrinter = new BluetoothPrinterService();
