export interface FluoraMcpClient {
  connect(mcpServerUrl: string): Promise<void>;
  disconnect(): Promise<void>;
  callTool(
    toolName: string,
    toolParams?: Record<string, unknown>
  ): Promise<unknown>;
  listTools(): Promise<unknown>;
}
