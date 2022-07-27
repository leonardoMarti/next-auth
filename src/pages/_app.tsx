import type { AppProps } from "next/app";
import { AuthProvider } from "../contexts/AuthContenxt";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
