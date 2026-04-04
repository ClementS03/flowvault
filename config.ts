import { ConfigProps } from "./types/config";

const config = {
  appName: "FlowVault",
  appDescription:
    "Store, share and copy Webflow components in one click.",
  domainName: "flowvault.io",
  crisp: {
    id: "",
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    plans: [
      {
        priceId:
          process.env.NODE_ENV === "development"
            ? "price_dev_pro"
            : "price_prod_pro",
        isFeatured: true,
        name: "Pro",
        description: "Unlimited components, unlimited sharing",
        price: 9,
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
