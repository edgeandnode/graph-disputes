import React from 'react';
import { SWRConfig } from 'swr';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import type { AppProps } from 'next/app';

import { useCreateStore, Provider } from '../store/zustandStore';

import 'antd/dist/antd.css';

const swrConfig = {
  // revalidateOnFocus: false,
  // shouldRetryOnError: false,
};
export const SWRConfigurationProvider: React.FC = ({ children }) => (
  <SWRConfig value={swrConfig}>{children}</SWRConfig>
);

const AppLayout = dynamic(() => import('../components/Layout'), { ssr: false });

export default function MyApp({ Component, pageProps }: AppProps) {
  const createStore = useCreateStore(pageProps.initialZustandState);

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    <SWRConfigurationProvider>
      <Provider createStore={createStore}>
        <AppLayout>
          <Head>
            <title>Dispute Portal</title>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
          </Head>
          <Component {...pageProps} />
        </AppLayout>
      </Provider>
    </SWRConfigurationProvider>
  );
}
