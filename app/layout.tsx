import "./globals.css";
import Script from "next/script";

import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "KAFES ONLINE",
  description: "Herramientas profesionales",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={poppins.className}>

        {/* META PIXEL */}
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;
            n.push=n;
            n.loaded=!0;
            n.version='2.0';
            n.queue=[];
            t=b.createElement(e);
            t.async=!0;
            t.src=v;
            s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}
            (window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', '1440401489906116');
            fbq('track', 'PageView');
          `}
        </Script>

        {/* TIKTOK PIXEL */}
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;
              var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];

              ttq.setAndDefer=function(t,e){
                t[e]=function(){
                  t.push([e].concat(Array.prototype.slice.call(arguments,0)))
                }
              };

              for(var i=0;i<ttq.methods.length;i++){
                ttq.setAndDefer(ttq,ttq.methods[i])
              }

              ttq.load=function(e,n){
                var r="https://analytics.tiktok.com/i18n/pixel/events.js";

                ttq._i=ttq._i||{};
                ttq._i[e]=[];
                ttq._i[e]._u=r;

                ttq._t=ttq._t||{};
                ttq._t[e]=+new Date;

                ttq._o=ttq._o||{};
                ttq._o[e]=n||{};

                n=document.createElement("script");
                n.type="text/javascript";
                n.async=!0;
                n.src=r+"?sdkid="+e+"&lib="+t;

                e=document.getElementsByTagName("script")[0];
                e.parentNode.insertBefore(n,e)
              };

              ttq.load('D8D21TBC77UFK9KDRPDG');
              ttq.page();

            }(window, document, 'ttq');
          `}
        </Script>

        {children}

      </body>
    </html>
  );
}