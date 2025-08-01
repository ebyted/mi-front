import { useEffect } from 'react';

const useDocumentTitle = (title, keepOnUnmount = true) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    
    if (!keepOnUnmount) {
      return () => {
        document.title = prevTitle;
      };
    }
  }, [title, keepOnUnmount]);
};

export default useDocumentTitle;
