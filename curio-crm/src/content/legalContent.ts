export type LegalPageSlug = "kyc" | "aml" | "privacy-policy" | "terms";

export type LegalSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPageContent = {
  slug: LegalPageSlug;
  title: string;
  sections: LegalSection[];
};

export const LEGAL_LINKS: { slug: LegalPageSlug; label: string }[] = [
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "kyc", label: "KYC Policy" },
  { slug: "aml", label: "AML Policy" },
];

const MARSHALL_ISLANDS =
  "Republic of the Marshall Islands. Any dispute arising from or relating to these terms shall be subject to the exclusive jurisdiction of the courts of the Republic of the Marshall Islands.";

export function legalContent(
  brandName: string,
  site = "curionilabs.com",
  supportEmail = `support@${site}`,
): Record<LegalPageSlug, LegalPageContent> {
  return {
    terms: {
      slug: "terms",
      title: `Terms and Conditions — ${site}`,
      sections: [
        {
          paragraphs: [
            `These Terms and Conditions govern your use of the ${site} trading platform and related services operated by ${brandName}. ${brandName} is an independent demonstration platform and is not affiliated with, endorsed by, or impersonating eToro Group Ltd or etoro.com. By creating an account, you confirm that you agree to these Terms and Conditions.`,
            `These Terms are governed by the laws of the ${MARSHALL_ISLANDS}`,
          ],
        },
        {
          heading: "1. Acceptance of Terms",
          paragraphs: [
            "Agreement to these Terms is mandatory for access to the platform and for creating a trading account.",
          ],
        },
        {
          heading: "2. Description of Service",
          paragraphs: [
            `${site} operates a multi-asset trading platform providing access to forex (FX), stocks & shares, cryptocurrencies, indices, metals, and commodities, together with educational content, account management, and customer support.`,
          ],
          bullets: [
            "Forex: Major, minor, and exotic currency pairs with margin trading where permitted.",
            "Stocks & Shares: Access to US and global equities and related instruments as listed on the platform.",
            "Crypto: Buy, sell, convert, and hold supported digital assets.",
            "Platform features: Charts, order execution, wallet funding, KYC verification, and notifications.",
            "Admin control: Platform operators manage instruments, spreads, compliance, and account status.",
          ],
        },
        {
          heading: "3. Account and Usage",
          paragraphs: ["When you create an account, you gain access to:"],
          bullets: [
            "Trading terminal for FX, shares, crypto, and other supported asset classes.",
            "Wallet funding, balance management, deposits, and withdrawals subject to verification.",
            "Market data, charts, and order history.",
            "Educational materials, announcements, and support channels.",
            "Identity verification (KYC) before certain transactions.",
          ],
        },
        {
          heading: "4. Fees and Payment",
          paragraphs: [
            "Trading may be subject to spreads, commissions, swap/rollover, and other fees disclosed on the platform. Deposits and withdrawals may incur processing fees. You are responsible for all charges associated with your account.",
          ],
        },
        {
          heading: "5. Risk Disclosure",
          paragraphs: [
            "Trading forex, stocks, shares, cryptocurrencies, and leveraged products involves substantial risk of loss and is not suitable for every investor. Past performance is not indicative of future results. You may lose more than your initial deposit where leverage applies.",
          ],
        },
        {
          heading: "6. Account Management and Termination",
          paragraphs: [
            `${brandName} reserves the right to suspend or terminate accounts that violate these Terms, applicable law, or AML/KYC requirements. Admins may monitor activity, adjust access, and manage platform content and compliance.`,
          ],
        },
        {
          heading: "7. Governing Law and Jurisdiction",
          paragraphs: [
            `These Terms shall be governed by and construed in accordance with the laws of the Republic of the Marshall Islands, without regard to conflict-of-law principles.`,
            `You agree that any legal action or proceeding arising out of or relating to these Terms or your use of ${site} shall be brought exclusively in the courts of the Republic of the Marshall Islands, and you consent to the personal jurisdiction of such courts.`,
          ],
        },
        {
          paragraphs: [`Questions: ${supportEmail}`],
        },
      ],
    },
    kyc: {
      slug: "kyc",
      title: "KYC (Know Your Customer) Policy",
      sections: [
        {
          paragraphs: [
            `${brandName} (${site}) is required to verify the identity of its clients in order to comply with international regulations and to prevent identity theft, money laundering, and fraud.`,
            `${brandName} holds a zero tolerance fraud policy. Any fraudulent activity will be documented and all related accounts to it will be immediately closed. All funds in these accounts will be forfeited.`,
          ],
        },
        {
          heading: "Prevention:",
          paragraphs: [
            "To ensure the safety of your funds and personal information, we require all clients to provide the following documents before making any cash transactions:",
          ],
          bullets: [
            "A copy of your valid passport with the signature page.",
            "Copies of your credit cards used to make the deposit (front side with only the last 4 digits visible, back side with the CVV covered).",
            "A copy of a recent utility bill in your name and address.",
            "A signed purchase history of your online transactions.",
          ],
        },
        {
          paragraphs: [
            `If you have any questions please don't hesitate to contact our customer support: ${supportEmail}`,
          ],
        },
        {
          heading: "When do I need to provide these documents?",
          paragraphs: [
            "We require the above documents prior to making any cash transactions from your account. If you have not submitted these documents, any pending withdrawals will be cancelled and credited back to your account.",
          ],
        },
        {
          heading: "How can I send you these documents?",
          paragraphs: [
            `Please scan your documents, or take a high quality digital camera picture, save the images as JPEGs, then send them to us via email at ${supportEmail}.`,
          ],
        },
      ],
    },
    aml: {
      slug: "aml",
      title: "AML (Anti-Money Laundering) Policy",
      sections: [
        {
          paragraphs: [
            `${brandName} is committed to the highest standards of anti-money laundering (AML) compliance. We have implemented policies and procedures designed to detect, prevent, and report suspicious activity in accordance with applicable laws and regulations.`,
            "Money laundering is the process of disguising the proceeds of crime by making them appear to have been derived from legitimate sources. We do not tolerate money laundering or the financing of terrorism.",
          ],
        },
        {
          heading: "Our Commitment",
          paragraphs: [
            `${brandName} maintains a comprehensive AML program that includes customer due diligence, ongoing monitoring of transactions, record keeping, and staff training. We cooperate fully with regulatory authorities and law enforcement agencies.`,
          ],
        },
        {
          heading: "Customer Due Diligence",
          bullets: [
            "Verification of client identity before account activation.",
            "Ongoing monitoring of account activity and transaction patterns.",
            "Enhanced due diligence for high-risk clients and jurisdictions.",
            "Regular review and updating of client information.",
          ],
        },
        {
          heading: "Suspicious Activity",
          paragraphs: [
            "We monitor transactions for unusual or suspicious activity. If we identify activity that may indicate money laundering or terrorist financing, we are obligated to report it to the relevant authorities without notifying the client.",
            `If you have questions regarding our AML policy, please contact us at ${supportEmail}.`,
          ],
        },
      ],
    },
    "privacy-policy": {
      slug: "privacy-policy",
      title: `Privacy Policy — ${site}`,
      sections: [
        {
          paragraphs: [
            `This Privacy Policy describes how ${brandName} (${site}) handles information related to the operation of its multi-asset trading platform offering forex, stocks & shares, cryptocurrencies, and related services.`,
            "Agreement to this policy is required to create an account.",
            `This Privacy Policy is governed by the laws of the ${MARSHALL_ISLANDS}`,
          ],
        },
        {
          heading: "1. Information We Collect",
          paragraphs: ["We collect information necessary to provide trading services, manage accounts, and enhance your experience."],
        },
        {
          heading: "A. Information Provided During Registration",
          bullets: [
            "Agreement status: Confirmation that you agree with this Privacy Policy and Terms & Conditions.",
            "Market interests: Your preferences regarding Stocks, Forex, Crypto, Commodities, Options, and Futures.",
            "Identity and contact details: Name, email, phone, date of birth, and address.",
            "Optional communications: Whether you wish to receive trading tips and platform updates.",
          ],
        },
        {
          heading: "B. Information Related to Trading Activity",
          bullets: [
            "Account management data for creating, editing, and maintaining your profile.",
            "Transaction history across FX, shares, crypto, and other instruments.",
            "Funding and withdrawal records.",
            "Activity tracking for compliance, support, and fraud prevention.",
            "Technical data: IP address, browser type, device identifiers, and usage patterns.",
          ],
        },
        {
          heading: "2. How We Use Your Information",
          paragraphs: [`${site} uses collected information to operate and manage the platform.`],
          bullets: [
            "Account access and authentication.",
            "Execution and settlement of trades in forex, equities, and crypto.",
            "Wallet funding, withdrawals, and balance notifications.",
            "KYC/AML compliance and identity verification.",
            "Customer support, reminders, and administrative announcements.",
            "Platform improvement, analytics, and security monitoring.",
          ],
        },
        {
          heading: "3. Optional Communications",
          paragraphs: [
            "If you opt in during registration, we may send trading tips, market updates, and educational content relevant to FX, stocks, and crypto.",
          ],
        },
        {
          heading: "4. Data Control and Security",
          paragraphs: [
            "We implement technical and organizational measures to protect personal data. Platform administrators manage user accounts, compliance workflows, and content delivery in accordance with internal policies.",
          ],
        },
        {
          heading: "5. Your Rights",
          paragraphs: [
            "Depending on applicable law, you may request access, correction, or deletion of your personal data. Contact us at " +
              supportEmail +
              " to exercise these rights.",
          ],
        },
        {
          heading: "6. Governing Law and Jurisdiction",
          paragraphs: [
            "This Privacy Policy shall be governed by the laws of the Republic of the Marshall Islands.",
            "Any dispute arising from or relating to this Privacy Policy shall be subject to the exclusive jurisdiction of the courts of the Republic of the Marshall Islands.",
          ],
        },
        {
          heading: "7. Changes to This Policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time. Material changes will be posted on this page with an updated effective date.",
          ],
        },
      ],
    },
  };
}

export function isLegalPageSlug(value: string | undefined): value is LegalPageSlug {
  return value === "kyc" || value === "aml" || value === "privacy-policy" || value === "terms";
}
