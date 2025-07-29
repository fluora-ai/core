import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FluoraApiService } from '../fluora-api.service';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('FluoraApiService', () => {
  let service: FluoraApiService;

  beforeEach(() => {
    service = new FluoraApiService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchServers', () => {
    it('should search servers with the provided filter', async () => {
      const filter = { name: 'test' };
      const mockServers = [
        { id: '1', name: 'test-server-1' },
        { id: '2', name: 'test-server-2' },
      ];

      // Mock the axios.get response
      vi.mocked(axios.get).mockResolvedValueOnce({ 
        data: mockServers
      });

      const result = await service.searchServers(filter);

      // Verify the correct API endpoint was called with parameters
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.fluora.ai/mcp-agents',
        {
          params: { name: 'test', category: '' }
        }
      );

      expect(result).toEqual(mockServers);
    });

    it('should search servers with empty filter', async () => {
      const filter = {};
      const mockServers = [
        { id: '1', name: 'all-server-1' },
        { id: '2', name: 'all-server-2' },
        { id: '3', name: 'all-server-3' },
      ];

      // Mock the axios.get response
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockServers
      });

      const result = await service.searchServers(filter);

      // Verify the correct API endpoint was called with empty parameters
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.fluora.ai/mcp-agents',
        {
          params: { name: '', category: '' }
        }
      );

      expect(result).toEqual(mockServers);
    });

    it('should handle API errors', async () => {
      const filter = { name: 'test' };

      // Mock axios to throw an error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('API error'));

      const result = await service.searchServers(filter);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('listServers', () => {
    it('should list servers with the provided filter', async () => {
      const filter = { category: 'AI' };
      const mockServers = [
        { id: '1', name: 'server-1', category: 'AI' },
        { id: '2', name: 'server-2', category: 'AI' },
      ];

      // Mock the axios.get response
      vi.mocked(axios.get).mockResolvedValueOnce({ 
        data: mockServers
      });

      const result = await service.listServers(filter);

      // Verify the correct API endpoint was called with parameters
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.fluora.ai/mcp-agents',
        {
          params: { name: '', category: 'AI' }
        }
      );

      expect(result).toEqual(mockServers);
    });

    it('should list all servers with empty filter', async () => {
        const filter = undefined;
        const mockServers = [
            { id: '1', name: 'all-server-1', category: 'General' },
            { id: '2', name: 'all-server-2', category: 'General' },
        ];

        // Mock the axios.get response
        vi.mocked(axios.get).mockResolvedValueOnce({
            data: mockServers
        });

        const result = await service.listServers(filter);

        // Verify the correct API endpoint was called with empty parameters
        expect(axios.get).toHaveBeenCalledWith(
            'https://api.fluora.ai/mcp-agents',
            {
            params: { name: '', category: '' }
            }
        );

        expect(result).toEqual(mockServers);
    })

    it('should handle API errors', async () => {
      const filter = { category: 'AI' };

      // Mock axios to throw an error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('API error'));

      const result = await service.listServers(filter);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getServerInfo', () => {
    it('should return server details for the provided ID', async () => {
      const serverId = 'server-123';
      const mockServer = { id: serverId, name: 'Test Server' };

      // Mock the axios.get response
      vi.mocked(axios.get).mockResolvedValueOnce({ 
        data: mockServer
      });

      const result = await service.getServerInfo(serverId);

      // Verify the correct API endpoint was called
      expect(axios.get).toHaveBeenCalledWith(
        `https://api.fluora.ai/mcp-agents/${serverId}`
      );

      expect(result).toEqual(mockServer);
    });

    it('should return null if server is not found', async () => {
      const serverId = 'non-existent';

      // Mock axios to throw a 404 error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Not found'));

      const result = await service.getServerInfo(serverId);

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      const serverId = 'server-123';

      // Mock axios to throw an error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('API error'));

      const result = await service.getServerInfo(serverId);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('validateServerUrl', () => {
    it('should return true if server URL is valid and accessible', async () => {
      const serverUrl = 'https://valid-server.com';

      // Mock successful response
      vi.mocked(axios.get).mockResolvedValueOnce({ status: 200 });

      const result = await service.validateServerUrl(serverUrl);

      // Verify the correct server URL was checked
      expect(axios.get).toHaveBeenCalledWith(`${serverUrl}/health`, {
        timeout: 5000,
      });
      expect(result).toBe(true);
    });

    it('should return false if server URL check fails', async () => {
      const serverUrl = 'https://invalid-server.com';

      // Mock failed request
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.validateServerUrl(serverUrl);

      expect(result).toBe(false);
    });
  });
});
