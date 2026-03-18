import { useEffect } from 'react';
import { LIB_SCRIPTS } from '../constants';

export function useLibraryScripts() {
  useEffect(() => {
    const loadScripts = async () => {
      for (const src of LIB_SCRIPTS) {
        if (!document.querySelector(`script[src="${src}"]`)) {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          document.head.appendChild(script);
        }
      }
    };
    loadScripts();
  }, []);
}
