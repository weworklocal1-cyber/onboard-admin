# 🍕 LocalWala Food — Corporate Website

Premium corporate website for LocalWala Food — built with Next.js 14, React 18, Three.js, and Framer Motion.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **3D:** React Three Fiber + Drei + Three.js
- **Animation:** Framer Motion + GSAP
- **Styling:** Tailwind CSS v3 + shadcn/ui system
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

## Folder Structure

```
localwala-food/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Homepage with 3D hero
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles + glassmorphism
│   │   ├── restaurant-partners/  # Restaurant onboarding form
│   │   ├── delivery-partners/    # Delivery partner recruitment
│   │   ├── careers/              # Careers page with job listings
│   │   ├── about-us/             # About Us brand page
│   │   └── contact-us/           # Contact form
│   ├── components/
│   │   ├── ui/                   # shadcn-style UI components
│   │   │   ├── button.tsx
│   │   │   ├── glass-card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── chip.tsx
│   │   │   ├── input.tsx         # Input + Textarea + Select
│   │   │   ├── animated-section.tsx
│   │   │   └── section-heading.tsx
│   │   ├── layout/
│   │   │   ├── navbar.tsx        # Responsive nav with glassmorphism
│   │   │   └── footer.tsx        # 4-column premium footer
│   │   ├── three/
│   │   │   ├── ThreeScene.tsx    # Main interactive 3D city ecosystem
│   │   │   ├── CityEcosystem.tsx
│   │   │   ├── DeliverySystem.tsx
│   │   │   ├── FoodObjects.tsx
│   │   │   └── FloatingCards.tsx
│   │   └── animations/
│   │       ├── scroll-reveal.tsx # ScrollReveal, StaggerContainer
│   │       └── cinematic-text.tsx
│   ├── lib/
│   │   ├── utils.ts              # cn() utility
│   │   └── animations.ts         # useInView, useMouseParallax, useCountUp
│   └── types/
│       └── forms.ts              # TypeScript interfaces for all forms
├── google-apps-script/
│   └── Code.gs                   # GAS backend for Google Sheets
├── public/
│   └── models/                   # 3D model assets (add .glb files here)
├── package.json
├── tailwind.config.js
├── next.config.mjs
└── .env.example
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google Apps Script

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Open **Extensions → Apps Script**
3. Paste the contents of `google-apps-script/Code.gs`
4. Click **Deploy → New deployment → Web app**
5. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Copy the Web App URL

### 3. Configure Environment

Create `.env.local` from `.env.example`:

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CONTACT_EMAIL=partners@localwalafood.com
NEXT_PUBLIC_CONTACT_PHONE=+91 98765 43210
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Build for Production

```bash
npm run build
npm start
```

## Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | 3D hero + scroll storytelling + feature grid |
| `/restaurant-partners` | Restaurant Onboarding | 3-step form with locality search, GPS, FSSAI fields |
| `/delivery-partners` | Delivery Recruitment | Bike/scooter/bicycle onboarding form |
| `/careers` | Job Openings | 30+ roles, department filter, application form |
| `/about-us` | About Us | Mission, vision, timeline, founder message |
| `/contact-us` | Contact | Contact form + office info |

## Form Fields Stored in Google Sheets

### Restaurant Partners Sheet
Owner Name, Mobile, WhatsApp, Email, Restaurant Name, Restaurant Type, State, District, City, Locality, Landmark, Full Address, Pincode, Latitude, Longitude, Primary Locality, Additional Localities, Delivery Radius, FSSAI Number, Number of Branches, Average Daily Orders, Additional Notes, Status, Timestamp

### Delivery Partners Sheet
Full Name, Mobile, WhatsApp, Email, State, District, City, Locality, Landmark, Pincode, Vehicle Type (Bike/Scooter/Bicycle), Availability (Full Time/Part Time), Latitude, Longitude, Preferred Working Areas, Max Travel Distance, Status, Timestamp

### Careers Sheet
Full Name, Mobile, WhatsApp, Email, Qualification, Experience, Current Company, Current Salary, Expected Salary, State, District, City, Locality, Position Applying For, Preferred Location, Resume Link, Portfolio Link, LinkedIn Profile, Portfolio Website, Cover Letter, Status, Timestamp

### Contact Leads Sheet
Name, Email, Mobile, Subject, Message, Status, Timestamp

## Design System

- **Primary Color:** `#FF6B00`
- **Font:** Inter (Google Fonts)
- **Glassmorphism:** `bg-white/70 backdrop-blur-xl`
- **Cards:** `GlassCard` component with hover lift
- **Buttons:** Gradient primary, outline, ghost variants
- **Chips:** Closeable tags for locality management
- **Animations:** Framer Motion (ScrollReveal, Stagger, spring)

## Performance

- Next.js Image optimization (AVIF/WebP)
- Tree-shaking via `optimizePackageImports`
- `next/font` for Inter
- Dynamic imports for Three.js components
- Responsive images

## Deployment

**Vercel (Recommended):**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm run build
# Deploy .next + public folder
```

**Docker:**
```bash
docker build -t localwala-food .
docker run -p 3000:3000 localwala-food
```

## Localities Data

Known localities are stored in `src/app/restaurant-partners/page.tsx`. Add more cities in the `knownLocalities` object as the platform expands.

---

© 2026 LocalWala Food. Delivering Local. Empowering Businesses.
