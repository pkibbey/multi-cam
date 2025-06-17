import { useState, useEffect } from 'react';
import { detectNetworkInfo } from '@/utils/network';

export function useNetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function getNetworkInfo() {
      try {
        setIsLoading(true);
        setError(null);
        const info = await detectNetworkInfo();
        
        if (isMounted) {
          setNetworkInfo(info);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to detect network');
          setNetworkInfo('unknown-network');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    getNetworkInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshNetworkInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await detectNetworkInfo();
      setNetworkInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect network');
      setNetworkInfo('unknown-network');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    networkInfo,
    isLoading,
    error,
    refreshNetworkInfo
  };
}
