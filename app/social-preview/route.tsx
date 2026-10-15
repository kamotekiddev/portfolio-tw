import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
   return new ImageResponse(
      (
         <div
            style={{
               width: "100%",
               height: "100%",
               display: "flex",
               flexDirection: "column",
               justifyContent: "space-between",
               padding: "56px 64px",
               background: "#141917",
               color: "#edf1e9",
               fontFamily: "sans-serif",
            }}
         >
            <div
               style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 26,
               }}
            >
               <span>Joshua Dela Cruz</span>
               <span style={{ color: "#64dba3" }}>kamote.dev</span>
            </div>
            <div
               style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 124,
                  lineHeight: 0.98,
                  letterSpacing: "-7px",
                  fontWeight: 700,
               }}
            >
               <span>Software</span>
               <span>x AI Engineer</span>
            </div>
            <div
               style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 24,
               }}
            >
               <span>Product software & AI engineering</span>
               <span>Metro Manila, Philippines</span>
            </div>
         </div>
      ),
      { width: 1200, height: 630 }
   );
}
