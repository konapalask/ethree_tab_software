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
    private printBuffer: Uint8Array[] = [];

    // USB State
    private usbDevice: any = null;
    private usbEndpoint: number | null = null;

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
     * Connect to USB Printer (OTG)
     */
    async connectUSB(): Promise<string> {
        try {
            if (!(navigator as any).usb) {
                throw new Error('WebUSB not supported on this browser.');
            }

            this.usbDevice = await (navigator as any).usb.requestDevice({
                filters: [{ classCode: 0x07 }] // Printer Class
            });

            await this.usbDevice.open();
            if (this.usbDevice.configuration === null) {
                await this.usbDevice.selectConfiguration(1);
            }

            // Find the printer interface
            const iface = this.usbDevice.configuration.interfaces.find((i: any) => 
                i.alternate.endpoints.some((e: any) => e.direction === 'out')
            ) || this.usbDevice.configuration.interfaces[0];

            await this.usbDevice.claimInterface(iface.interfaceNumber);

            const endpoint = iface.alternate.endpoints.find((e: any) => e.direction === 'out');
            if (!endpoint) throw new Error('No output endpoint found on USB printer.');
            
            this.usbEndpoint = endpoint.endpointNumber;
            console.log('USB Printer Connected:', this.usbDevice.productName);
            return this.usbDevice.productName || 'USB Thermal Printer';
        } catch (error: any) {
            console.error('USB Connection failed:', error);
            throw error;
        }
    }

    /**
     * Auto-reconnect to the first authorized USB device
     */
    async autoConnectUSB(): Promise<string | null> {
        if (!(navigator as any).usb) return null;

        try {
            const devices = await (navigator as any).usb.getDevices();
            const printer = devices.find((d: any) => d.opened === false); // Pick the first recognized printer

            if (printer) {
                this.usbDevice = printer;
                await this.usbDevice.open();
                if (this.usbDevice.configuration === null) {
                    await this.usbDevice.selectConfiguration(1);
                }
                const iface = this.usbDevice.configuration.interfaces[0];
                await this.usbDevice.claimInterface(iface.interfaceNumber);
                const endpoint = iface.alternate.endpoints.find((e: any) => e.direction === 'out');
                this.usbEndpoint = endpoint?.endpointNumber || null;
                return this.usbDevice.productName || 'USB Thermal Printer';
            }
        } catch (e) {
            console.warn('USB Auto-connect failed', e);
        }
        return null;
    }

    /**
     * Connect to any compatible Bluetooth Printer
     * @param targetName Optional name to filter for (e.g. "PRINTER 001-6D49")
     */
    async connect(targetName?: string): Promise<string> {
        if ((window as any).__NATIVE_BT_BRIDGE__) {
            return await (window as any).BluetoothPrinter.connect(targetName);
        }

        try {
            if (!(navigator as any).bluetooth) {
                // Check if this is a Median App
                const isMedian = navigator.userAgent.includes('Median');
                if (isMedian) {
                    throw new Error('Median App detected. Please ensure the "Web Bluetooth" plugin is enabled in your Median.co dashboard.');
                }
                throw new Error('Bluetooth not supported on this browser.');
            }

            console.log("Starting printer discovery...");
            
            const options: any = {
                optionalServices: this.COMMON_SERVICES
            };

            options.acceptAllDevices = true;
            
            this.device = await (navigator as any).bluetooth.requestDevice(options);

            console.log('Connecting to GATT Server...');
            const server = await this.device.gatt.connect();
            
            // Shared Setup Logic
            await this.setupService(server);

            console.log('Printer Connected and Verified:', this.device.name);
            return this.device.name || 'Thermal Printer';
        } catch (error: any) {
            console.error('Universal Connection failed:', error);
            throw error;
        }
    }

    /**
     * Attempt to reconnect to a previously authorized device without a picker
     * (Experimental Web Bluetooth feature)
     */
    async autoConnect(targetName: string): Promise<string | null> {
        if ((window as any).__NATIVE_BT_BRIDGE__) {
            return await (window as any).BluetoothPrinter.autoConnect(targetName);
        }

        if (!(navigator as any).bluetooth || !(navigator as any).bluetooth.getDevices) {
            return null;
        }

        try {
            const devices = await (navigator as any).bluetooth.getDevices();
            const target = devices.find((d: any) => d.name === targetName);

            if (target) {
                console.log('Attempting Auto-Reconnect to:', targetName);
                this.device = target;
                const server = await this.device.gatt.connect();
                await this.setupService(server);
                return this.device.name;
            }
        } catch (e) {
            console.warn('Auto-reconnect failed, falling back to manual picker', e);
        }
        return null;
    }

    /**
     * Internal logic to find the correct service and characteristic
     */
    private async setupService(server: any) {
        // Attempt to find any of our known services
        let service = null;
        
        for (const uuid of this.COMMON_SERVICES) {
            try {
                service = await server.getPrimaryService(uuid);
                if (service) break;
            } catch (e) {
                continue;
            }
        }

        if (!service) {
            try {
                const services = await server.getPrimaryServices();
                if (services.length > 0) service = services[0];
            } catch (e) {
                throw new Error('No compatible print service found.');
            }
        }

        if (!service) throw new Error('Could not resolve printer service.');

        // Attempt to find the write characteristic
        const characteristics = await service.getCharacteristics();
        this.characteristic = characteristics.find((c: any) => 
            c.properties.write || c.properties.writeWithoutResponse
        );

        if (!this.characteristic) {
            throw new Error('No write characteristic found.');
        }
    }

    /**
     * Send raw data in chunks (Printers often have small buffers)
     */
    private async write(data: Uint8Array, flush = false) {
        // --- NATIVE BRIDGE ---
        if ((window as any).__NATIVE_BT_BRIDGE__) {
            this.printBuffer.push(data);
            if (flush) {
                const totalLength = this.printBuffer.reduce((acc, val) => acc + val.length, 0);
                const finalData = new Uint8Array(totalLength);
                let offset = 0;
                for (let arr of this.printBuffer) {
                    finalData.set(arr, offset);
                    offset += arr.length;
                }
                const binaryString = Array.from(finalData).map(byte => String.fromCharCode(byte)).join('');
                const b64 = btoa(binaryString);
                await (window as any).BluetoothPrinter.printRawBase64(b64);
                this.printBuffer = [];
            }
            return;
        }

        // --- USB (OTG) ---
        if (this.usbDevice && this.usbEndpoint !== null) {
            try {
                await this.usbDevice.transferOut(this.usbEndpoint, data);
                return;
            } catch (usbError) {
                console.warn('USB Write failed, falling back to Bluetooth if available', usbError);
            }
        }

        // --- BLUETOOTH ---
        if (!this.characteristic) {
            if (this.device && this.device.gatt.connected) {
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
                const line = `${name.padEnd(20)} x${item.quantity}\n`;
                await this.write(encoder.encode(line));
                
                if (!name.includes('COMBO')) {
                    await this.write(encoder.encode(`Price: INR ${item.price * item.quantity}\n`));
                }
            }

            // 5. Total
            const containsCombo = data.items.some(i => i.name.toUpperCase().includes('COMBO'));
            await this.write(encoder.encode("--------------------------------\n"));
            if (!containsCombo) {
                await this.write(this.COMMANDS.BOLD_ON);
                await this.write(encoder.encode(`TOTAL PAYABLE: INR ${data.total}\n`));
                await this.write(this.COMMANDS.BOLD_OFF);
            }
            
            // 6. Payment Mode
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
            
            // 8. Cut
            await this.write(new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A]));
            await this.write(this.COMMANDS.FEED_CUT, true);
        } catch (e) {
            console.error("Print execution failed", e);
            throw e;
        }
    }

    get isConnected() {
        if ((window as any).__NATIVE_BT_BRIDGE__) {
            return (window as any).BluetoothPrinter.isConnected;
        }
        const btOk = this.device && this.device.gatt.connected && this.characteristic;
        const usbOk = this.usbDevice && this.usbEndpoint !== null;
        return btOk || usbOk;
    }

    get connectionType() {
        if (this.usbDevice) return 'usb';
        if (this.device) return 'bluetooth';
        return 'none';
    }
}

export const BluetoothPrinter = new BluetoothPrinterService();

