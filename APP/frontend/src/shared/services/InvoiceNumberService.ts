export class InvoiceNumberService {
  private static readonly TEMP_NUMBER_PREFIX = 'TEMP-';
  private static tempCounter = 0;

  private static getTerminalId(): string {
    let terminalId = localStorage.getItem('terminal_id');
    if (!terminalId) {
      terminalId = `PC-${crypto.randomUUID()}`;
      localStorage.setItem('terminal_id', terminalId);
    }
    return terminalId;
  }

  static async initialize(): Promise<void> {
    // No-op in cloud mode
  }

  static async destroy(): Promise<void> {
    // No-op in cloud mode
  }

  static async getNextInvoiceNumber(): Promise<string> {
    this.tempCounter += 1;
    const terminal = this.getTerminalId();
    const timestamp = Date.now().toString(36);
    const counter = this.tempCounter.toString().padStart(3, '0');
    return `${this.TEMP_NUMBER_PREFIX}${terminal}-${timestamp}-${counter}`;
  }

  static async getTemporaryNumberCount(): Promise<number> {
    return 0;
  }

  static async resolveTemporaryNumbers(): Promise<boolean> {
    return false;
  }

  static async getStats(): Promise<{
    totalRanges: number;
    activeRanges: number;
    expiredRanges: number;
    completedRanges: number;
    recyclableNumbers: number;
    terminalRanges: { [terminalId: string]: number };
  }> {
    return {
      totalRanges: 0,
      activeRanges: 0,
      expiredRanges: 0,
      completedRanges: 0,
      recyclableNumbers: 0,
      terminalRanges: {},
    };
  }
}
