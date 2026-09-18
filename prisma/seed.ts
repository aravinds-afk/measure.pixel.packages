import { PrismaClient, Role, LeadStatus, DealStage, TaskStatus, Priority, InvoiceStatus, CustomerStatus, FollowUpType, FollowUpStatus, CallDirection, CallOutcome, DocumentCategory, CampaignType, CampaignStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Password123!";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pastDate(daysBack: number) {
  return faker.date.recent({ days: daysBack });
}
function futureDate(daysAhead: number) {
  return faker.date.soon({ days: daysAhead });
}

async function main() {
  console.log("Seeding Measure Pixel demo data...");
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.document.deleteMany();
  await prisma.email.deleteMany();
  await prisma.call.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Measure Pixel Labs Pvt Ltd",
      industry: "Software & SaaS",
      address: "4th Floor, Cyber Towers, HITEC City, Hyderabad, Telangana 500081",
      phone: "+91 40 4567 8900",
      email: "hello@measurepixel.com",
      website: "https://measurepixel.com",
      taxId: "29ABCDE1234F1Z5",
      timezone: "Asia/Kolkata",
      currency: "INR",
      workingHours: "09:30-18:30",
      onboarded: true,
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Aravind Krishnan",
      email: "superadmin@measurepixel.com",
      passwordHash,
      role: Role.SUPER_ADMIN,
      department: "Executive",
      designation: "Founder & CEO",
      companyId: company.id,
      phone: "+91 98765 43210",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "admin@measurepixel.com",
      passwordHash,
      role: Role.ADMIN,
      department: "Operations",
      designation: "Operations Head",
      companyId: company.id,
      managerId: superAdmin.id,
      phone: "+91 98765 43211",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Rohan Mehta",
      email: "manager@measurepixel.com",
      passwordHash,
      role: Role.MANAGER,
      department: "Sales",
      designation: "Sales Manager",
      companyId: company.id,
      managerId: admin.id,
      phone: "+91 98765 43212",
    },
  });

  const salesNames = ["Ananya Iyer", "Karthik Reddy", "Sneha Nair", "Vikram Singh"];
  const salesExecs = [];
  for (let i = 0; i < salesNames.length; i++) {
    const u = await prisma.user.create({
      data: {
        name: salesNames[i],
        email: `sales${i + 1}@measurepixel.com`,
        passwordHash,
        role: Role.SALES_EXECUTIVE,
        department: "Sales",
        designation: "Sales Executive",
        companyId: company.id,
        managerId: manager.id,
        phone: faker.phone.number({ style: "international" }),
      },
    });
    salesExecs.push(u);
  }

  const empNames = ["Divya Menon", "Arjun Rao", "Neha Kapoor", "Suresh Kumar"];
  const employees = [];
  for (let i = 0; i < empNames.length; i++) {
    const u = await prisma.user.create({
      data: {
        name: empNames[i],
        email: `employee${i + 1}@measurepixel.com`,
        passwordHash,
        role: Role.EMPLOYEE,
        department: pick(["Support", "Onboarding", "Success"]),
        designation: "Associate",
        companyId: company.id,
        managerId: manager.id,
        phone: faker.phone.number({ style: "international" }),
      },
    });
    employees.push(u);
  }

  const staff = [admin, manager, ...salesExecs, ...employees];

  const customerPortalUser = await prisma.user.create({
    data: {
      name: "Meera Pillai",
      email: "customer@measurepixel.com",
      passwordHash,
      role: Role.CUSTOMER,
      companyId: company.id,
      phone: faker.phone.number({ style: "international" }),
    },
  });

  // Campaigns
  const campaignNames = [
    "Diwali SaaS Push", "LinkedIn ABM Q3", "Google Search - CRM Keywords",
    "Webinar: Scale Your Sales", "Referral Booster", "Product Hunt Launch",
  ];
  const campaigns = [];
  for (const name of campaignNames) {
    const start = pastDate(120);
    const c = await prisma.campaign.create({
      data: {
        name,
        type: pick(Object.values(CampaignType)),
        status: pick(Object.values(CampaignStatus)),
        startDate: start,
        endDate: faker.date.soon({ days: 30, refDate: start }),
        targetAudience: pick(["SMB Founders", "Enterprise IT", "Sales Managers", "Startups"]),
        budget: rand(20000, 300000),
        revenue: rand(0, 800000),
      },
    });
    campaigns.push(c);
  }

  const industries = ["IT Services", "E-commerce", "Manufacturing", "Healthcare", "Education", "FinTech", "Real Estate", "Logistics"];
  const sources = ["Website", "Referral", "Cold Call", "LinkedIn", "Google Ads", "Webinar", "Trade Show"];

  // Customers
  const customers = [];
  for (let i = 0; i < 26; i++) {
    const name = faker.person.fullName();
    const c = await prisma.customer.create({
      data: {
        name,
        company: faker.company.name(),
        email: faker.internet.email({ firstName: name.split(" ")[0] }).toLowerCase(),
        phone: faker.phone.number({ style: "international" }),
        status: pick(Object.values(CustomerStatus)),
        address: faker.location.streetAddress({ useFullAddress: true }),
        industry: pick(industries),
        assignedToId: pick(staff).id,
        lastContact: pastDate(30),
        notes: faker.lorem.sentence(),
        createdAt: pastDate(300),
      },
    });
    customers.push(c);
  }
  await prisma.customer.update({ where: { id: customers[0].id }, data: { portalUserId: customerPortalUser.id, name: "Meera Pillai", email: "customer@measurepixel.com" } });

  // Leads
  const leadStatuses = Object.values(LeadStatus);
  const leads = [];
  for (let i = 0; i < 34; i++) {
    const name = faker.person.fullName();
    const status = pick(leadStatuses);
    const l = await prisma.lead.create({
      data: {
        name,
        company: faker.company.name(),
        email: faker.internet.email({ firstName: name.split(" ")[0] }).toLowerCase(),
        phone: faker.phone.number({ style: "international" }),
        source: pick(sources),
        industry: pick(industries),
        value: rand(15000, 900000),
        status,
        priority: pick(Object.values(Priority)),
        assignedToId: pick(salesExecs).id,
        campaignId: Math.random() > 0.4 ? pick(campaigns).id : null,
        notes: faker.lorem.sentence(),
        nextFollowUp: status === "WON" || status === "LOST" ? null : futureDate(14),
        convertedAt: status === "WON" ? pastDate(20) : null,
        createdAt: pastDate(180),
      },
    });
    leads.push(l);
  }

  // Deals
  const dealStages = Object.values(DealStage);
  const deals = [];
  for (let i = 0; i < 24; i++) {
    const stage = pick(dealStages);
    const relatedCustomer = Math.random() > 0.3 ? pick(customers) : null;
    const relatedLead = Math.random() > 0.5 ? pick(leads) : null;
    const d = await prisma.deal.create({
      data: {
        name: `${pick(["Enterprise", "Growth", "Starter", "Pro"])} Plan - ${(relatedCustomer?.company) ?? faker.company.name()}`,
        customerId: relatedCustomer?.id,
        leadId: relatedLead?.id,
        value: rand(25000, 1200000),
        probability: stage === "WON" ? 100 : stage === "LOST" ? 0 : rand(10, 90),
        stage,
        expectedClose: futureDate(60),
        assignedToId: pick(salesExecs).id,
        notes: faker.lorem.sentence(),
        lostReason: stage === "LOST" ? pick(["Budget constraints", "Chose competitor", "No response", "Timing not right"]) : null,
        createdAt: pastDate(150),
      },
    });
    deals.push(d);
  }

  // Tasks
  const taskTitles = [
    "Send proposal document", "Follow up on pricing", "Schedule product demo", "Prepare contract draft",
    "Update CRM records", "Call to confirm requirements", "Send onboarding kit", "Review renewal terms",
    "Collect feedback survey", "Escalate support ticket", "Send invoice reminder", "Prepare QBR deck",
  ];
  for (let i = 0; i < 28; i++) {
    const status = pick(Object.values(TaskStatus));
    await prisma.task.create({
      data: {
        title: pick(taskTitles),
        description: faker.lorem.sentence(),
        assignedToId: pick(staff).id,
        customerId: Math.random() > 0.3 ? pick(customers).id : null,
        priority: pick(Object.values(Priority)),
        dueDate: status === "COMPLETED" ? pastDate(20) : futureDate(20),
        status,
        reminder: Math.random() > 0.5,
        createdAt: pastDate(60),
      },
    });
  }

  // FollowUps
  for (let i = 0; i < 20; i++) {
    const useCustomer = Math.random() > 0.4;
    const scheduled = Math.random() > 0.5 ? futureDate(10) : pastDate(10);
    await prisma.followUp.create({
      data: {
        type: pick(Object.values(FollowUpType)),
        customerId: useCustomer ? pick(customers).id : null,
        leadId: !useCustomer ? pick(leads).id : null,
        assignedToId: pick(salesExecs.concat(employees)).id,
        scheduledAt: scheduled,
        notes: faker.lorem.sentence(),
        reminder: true,
        status: scheduled < new Date() ? pick(["OVERDUE", "COMPLETED"]) : "PENDING",
        createdAt: pastDate(30),
      },
    });
  }

  // Calendar events
  const eventTypes = ["meeting", "call", "demo", "deadline", "follow-up"];
  for (let i = 0; i < 18; i++) {
    const start = Math.random() > 0.5 ? futureDate(21) : pastDate(21);
    const end = new Date(start.getTime() + rand(30, 90) * 60000);
    await prisma.calendarEvent.create({
      data: {
        title: `${pick(["Discovery call", "Product Demo", "Contract Review", "Renewal Discussion", "Kickoff Meeting", "QBR"])} - ${pick(customers).company}`,
        type: pick(eventTypes),
        start,
        end,
        userId: pick(staff).id,
        customerId: pick(customers).id,
        notes: faker.lorem.sentence(),
      },
    });
  }

  // Calls
  for (let i = 0; i < 26; i++) {
    const useCustomer = Math.random() > 0.4;
    await prisma.call.create({
      data: {
        customerId: useCustomer ? pick(customers).id : null,
        leadId: !useCustomer ? pick(leads).id : null,
        employeeId: pick(salesExecs).id,
        phone: faker.phone.number({ style: "international" }),
        direction: pick(Object.values(CallDirection)),
        duration: rand(0, 1400),
        outcome: pick(Object.values(CallOutcome)),
        notes: faker.lorem.sentence(),
        nextFollowUp: Math.random() > 0.5 ? futureDate(10) : null,
        createdAt: pastDate(45),
      },
    });
  }

  // Emails
  const emailSubjects = [
    "Proposal for your review", "Following up on our call", "Welcome to Measure Pixel",
    "Your invoice is ready", "Product demo recap", "Contract for signature", "Quick check-in",
  ];
  for (let i = 0; i < 22; i++) {
    const useCustomer = Math.random() > 0.4;
    await prisma.email.create({
      data: {
        customerId: useCustomer ? pick(customers).id : null,
        leadId: !useCustomer ? pick(leads).id : null,
        employeeId: pick(staff).id,
        subject: pick(emailSubjects),
        body: faker.lorem.paragraphs(2),
        direction: pick(["SENT", "RECEIVED"]),
        status: pick(["SENT", "OPENED", "REPLIED"]),
        createdAt: pastDate(50),
      },
    });
  }

  // Invoices + items + payments
  const invoiceStatuses = Object.values(InvoiceStatus);
  for (let i = 0; i < 20; i++) {
    const customer = pick(customers);
    const status = pick(invoiceStatuses);
    const issueDate = pastDate(90);
    const dueDate = new Date(issueDate.getTime() + 15 * 86400000);
    const invoice = await prisma.invoice.create({
      data: {
        number: `INV-${2000 + i}`,
        customerId: customer.id,
        dealId: Math.random() > 0.5 ? pick(deals).id : null,
        issueDate,
        dueDate,
        tax: 18,
        discount: pick([0, 0, 5, 10]),
        status,
      },
    });
    const itemCount = rand(1, 3);
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const price = rand(5000, 150000);
      const quantity = rand(1, 3);
      subtotal += price * quantity;
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          name: pick(["Measure Pixel Pro License", "Onboarding & Setup", "Custom Integration", "Premium Support Plan", "Additional User Seats"]),
          quantity,
          price,
        },
      });
    }
    if (status === "PAID" || status === "PARTIALLY_PAID") {
      const total = subtotal * 1.18;
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          customerId: customer.id,
          amount: status === "PAID" ? Math.round(total) : Math.round(total * 0.5),
          method: pick(["Bank Transfer", "UPI", "Credit Card", "Cheque"]),
          status: "SUCCESS",
          paidAt: pastDate(30),
        },
      });
    }
  }

  // Documents
  const docNames = [
    "Master Service Agreement.pdf", "NDA - Signed.pdf", "Proposal_v2.pdf", "Onboarding_Checklist.pdf",
    "Invoice_Template.pdf", "Company_Profile.pdf", "SOW_2024.pdf", "Renewal_Contract.pdf",
    "Pricing_Sheet.pdf", "Product_Brochure.pdf", "Compliance_Cert.pdf", "Support_SLA.pdf",
  ];
  const docCategories = Object.values(DocumentCategory);
  for (const name of docNames) {
    await prisma.document.create({
      data: {
        name,
        category: pick(docCategories),
        customerId: Math.random() > 0.4 ? pick(customers).id : null,
        uploadedById: pick(staff).id,
        size: rand(50, 5000) * 1024,
        fileType: "pdf",
        createdAt: pastDate(120),
      },
    });
  }

  // Notifications
  const notifTemplates: { title: string; message: string; type: string }[] = [
    { title: "New lead assigned", message: "A new lead has been assigned to you.", type: "LEAD" },
    { title: "Task due soon", message: "You have a task due within 24 hours.", type: "TASK" },
    { title: "Follow-up reminder", message: "You have a scheduled follow-up today.", type: "FOLLOWUP" },
    { title: "Payment received", message: "A payment has been recorded against an invoice.", type: "PAYMENT" },
    { title: "Invoice overdue", message: "An invoice has crossed its due date.", type: "INVOICE" },
    { title: "Deal stage changed", message: "A deal has moved to a new pipeline stage.", type: "DEAL" },
  ];
  for (const u of [superAdmin, admin, manager, ...salesExecs, ...employees]) {
    const n = rand(2, 5);
    for (let i = 0; i < n; i++) {
      const t = pick(notifTemplates);
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: t.title,
          message: t.message,
          type: t.type,
          read: Math.random() > 0.55,
          createdAt: pastDate(15),
        },
      });
    }
  }

  // Activity log
  const actions = [
    { action: "CREATE", module: "Customer", description: "created a new customer record" },
    { action: "UPDATE", module: "Lead", description: "updated lead status" },
    { action: "CREATE", module: "Deal", description: "created a new deal" },
    { action: "UPDATE", module: "Deal", description: "moved deal to a new stage" },
    { action: "COMPLETE", module: "Task", description: "completed a task" },
    { action: "CREATE", module: "Invoice", description: "generated a new invoice" },
    { action: "RECEIVE", module: "Payment", description: "recorded a payment" },
    { action: "LOGIN", module: "Auth", description: "logged into Measure Pixel" },
    { action: "UPDATE", module: "Permission", description: "updated user permissions" },
  ];
  for (let i = 0; i < 46; i++) {
    const a = pick(actions);
    await prisma.activity.create({
      data: {
        userId: pick(staff).id,
        action: a.action,
        module: a.module,
        description: `${a.description}`,
        customerId: Math.random() > 0.6 ? pick(customers).id : null,
        leadId: Math.random() > 0.8 ? pick(leads).id : null,
        dealId: Math.random() > 0.8 ? pick(deals).id : null,
        createdAt: pastDate(60),
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo login password for all accounts:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
