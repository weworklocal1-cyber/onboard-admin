export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "LocalWala Food",
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || "Delivering Local. Empowering Businesses.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "partners@localwalafood.com",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 98765 43210",
    address:
      process.env.NEXT_PUBLIC_CONTACT_ADDRESS || "Vijayawada, Andhra Pradesh, India",
    workingHours:
      process.env.NEXT_PUBLIC_CONTACT_WORKING_HOURS || "Mon - Sat: 9:00 AM - 6:00 PM",
  },
  social: {
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || "#",
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || "#",
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "#",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || "#",
  },
};
