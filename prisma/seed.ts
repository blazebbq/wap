import { PrismaClient, BusinessStatus, MemberRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Platform admin user ─────────────────────────────────────────────────
  const platformAdmin = await prisma.platformUser.upsert({
    where: { email: "admin@yourbrand.co.uk" },
    update: {},
    create: {
      email: "admin@yourbrand.co.uk",
      name: "Platform Admin",
      isPlatformAdmin: true,
    },
  });
  console.log("✅ Platform admin:", platformAdmin.email);

  // ─── Demo business ───────────────────────────────────────────────────────
  const business = await prisma.business.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Demo Salon",
      subdomain: "demo",
      timezone: "Europe/London",
      status: BusinessStatus.active,
    },
  });
  console.log("✅ Business:", business.name, `(${business.subdomain})`);

  // Business domain record
  await prisma.businessDomain.upsert({
    where: { domain: "demo.yourbrand.co.uk" },
    update: {},
    create: {
      businessId: business.id,
      domain: "demo.yourbrand.co.uk",
      type: "subdomain",
    },
  });

  // Membership: platform admin is owner of demo business
  await prisma.businessMembership.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: platformAdmin.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: platformAdmin.id,
      role: MemberRole.owner,
    },
  });

  // ─── Services ────────────────────────────────────────────────────────────
  const service1 = await prisma.service.upsert({
    where: { id: "service-seed-1" },
    update: {},
    create: {
      id: "service-seed-1",
      businessId: business.id,
      name: "Haircut",
      durationMin: 30,
      pricePence: 2500,
      active: true,
    },
  });

  const service2 = await prisma.service.upsert({
    where: { id: "service-seed-2" },
    update: {},
    create: {
      id: "service-seed-2",
      businessId: business.id,
      name: "Colour & Style",
      durationMin: 90,
      pricePence: 7500,
      active: true,
    },
  });
  console.log("✅ Services:", service1.name, "&", service2.name);

  // ─── Template home page ──────────────────────────────────────────────────
  const homePage = await prisma.page.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "home",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      slug: "home",
      title: "Home",
    },
  });

  const blocksJson = [
    {
      id: "block-hero-1",
      type: "hero",
      props: {
        heading: "Welcome to Demo Salon",
        subheading: "Professional hair care in the heart of London",
        ctaText: "Book Now",
        ctaHref: "/book",
      },
    },
    {
      id: "block-services-1",
      type: "services",
      props: {
        title: "Our Services",
        serviceIds: [service1.id, service2.id],
        showPrices: true,
      },
    },
    {
      id: "block-contact-1",
      type: "contact",
      props: {
        phone: "+44 20 7946 0958",
        email: "hello@demosalon.co.uk",
        address: "123 High Street, London, W1A 1AA",
        mapEnabled: false,
      },
    },
  ];

  const pageVersion = await prisma.pageVersion.create({
    data: {
      pageId: homePage.id,
      versionNumber: 1,
      blocksJson,
    },
  });

  // Set as published version
  await prisma.page.update({
    where: { id: homePage.id },
    data: { publishedVersionId: pageVersion.id },
  });
  console.log("✅ Home page with", blocksJson.length, "blocks published");

  // ─── Availability rules (Mon-Fri 9am-6pm) ────────────────────────────────
  const workDays = [1, 2, 3, 4, 5]; // Mon-Fri
  for (const day of workDays) {
    await prisma.availabilityRule.upsert({
      where: {
        id: `avail-rule-${business.id}-${day}`,
      },
      update: {},
      create: {
        id: `avail-rule-${business.id}-${day}`,
        businessId: business.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "18:00",
      },
    });
  }
  console.log("✅ Availability rules created for Mon-Fri");

  console.log("\n🎉 Seed complete!");
  console.log(`\nPlatform admin login: admin@yourbrand.co.uk`);
  console.log(`Business subdomain:   demo.yourbrand.co.uk`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
