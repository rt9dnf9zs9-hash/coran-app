import { useEffect, useState } from 'react';

// Routage par ancre (#/…) : compatible GitHub Pages sans configuration serveur.
export interface Route {
  path: string;
  parts: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path = '/', qs = ''] = hash.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string, replace = false): void {
  const target = `#${path}`;
  if (replace) window.location.replace(target);
  else window.location.hash = path;
}

export const href = (path: string) => `#${path}`;
