import { ConfigProps } from "./types/config";

const config = {
  appName: "FlowVault",
  appDescription: "Store, share and copy Webflow components in one click.",
  domainName: "flowvault.io",
  crisp: {
    id: "",
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    plans: [
      {
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_1TITMnIEMd7KisSxfevrBgcs",
        isFeatured: true,
        name: "Pro",
        description: "Unlimited components, unlimited sharing",
        price: 9,
        priceAnchor: 19,
        features: [
          { name: "Unlimited components" },
          { name: "Public & private sharing" },
          { name: "Priority support" },
        ],
      },
    ],
  },
  mailgun: {
    subdomain: "mg",
    fromNoReply: `FlowVault <noreply@mg.flowvault.io>`,
    fromAdmin: `FlowVault <hello@flowvault.io>`,
    supportEmail: "hello@flowvault.io",
    forwardRepliesTo: "hello@flowvault.io",
  },
  colors: {
    main: "#6366f1",
  },
  auth: {
    loginUrl: "/signin",
    callbackUrl: "/dashboard",
  },
} as ConfigProps;

export default config;
