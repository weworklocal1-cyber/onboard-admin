import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabase";

const COMPANY = {
  name: "WeWorkLocal",
  tagline: "India's Smart Local Services & Marketplace Platform",
  email: "onboarding@localwala.tech",
  phone: "+91 9182793401",
  address: [
    "Dullapally",
    "Dundigal-Gandimaisamma",
    "Medchal-Malkajgiri",
    "Telangana Pin Code: 500100",
  ],
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.6,
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    borderBottom: "2pt solid #2563eb",
    paddingBottom: 12,
  },
  brandBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  brandText: {
    flex: 1,
  },
  brandName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  brandTagline: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  dateLine: {
    marginBottom: 16,
    fontSize: 11,
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginVertical: 12,
    letterSpacing: 1,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 10,
  },
  dividerLine: {
    width: 40,
    height: 1,
    backgroundColor: "#2563eb",
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563eb",
  },
  toBlock: {
    marginBottom: 12,
  },
  subjectBlock: {
    marginBottom: 14,
  },
  body: {
    gap: 10,
  },
  footerBlock: {
    marginTop: 24,
    paddingTop: 12,
    borderTop: "1pt solid #e5e7eb",
    gap: 6,
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  footerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  footerColumn: {
    flex: 1,
    fontSize: 9,
    color: "#4b5563",
  },
});

function InternshipLetterPdf({
  userName,
  letterDate,
  internStartDate,
}: {
  userName: string;
  letterDate: string;
  internStartDate: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBox}>
            <Text>WL</Text>
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandName}>{COMPANY.name}</Text>
            <Text style={styles.brandTagline}>{COMPANY.tagline}</Text>
          </View>
        </View>

        <Text style={styles.dateLine}>
          Date: <Text style={{ fontWeight: "bold" }}>{letterDate}</Text>
        </Text>

        <Text style={styles.sectionTitle}>INTERNSHIP APPOINTMENT LETTER</Text>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.toBlock}>
          <Text>To,</Text>
          <Text style={{ fontWeight: "bold" }}>{userName}</Text>
        </View>

        <View style={styles.subjectBlock}>
          <Text>
            Subject: <Text style={{ fontWeight: "bold" }}>Appointment as Intern – Mobile Application Development</Text>
          </Text>
        </View>

        <View style={styles.body}>
          <Text>
            Dear <Text style={{ fontWeight: "bold" }}>{userName}</Text>,
          </Text>

          <Text>
            We are pleased to inform you that you have been selected as an{" "}
            <Text style={{ fontWeight: "bold" }}>Intern – Mobile Application Development</Text> at{" "}
            <Text style={{ fontWeight: "bold" }}>{COMPANY.name}</Text>. This selection is based on your successful
            completion of the certification program through our onboarding portal at{" "}
            <Text style={{ fontWeight: "bold" }}>onboard.localwala.tech</Text>. We are confident that your skills and
            enthusiasm will be a valuable addition to our team.
          </Text>

          <Text>
            Your internship will commence from <Text style={{ fontWeight: "bold" }}>{internStartDate}</Text> and will
            continue for a period of <Text style={{ fontWeight: "bold" }}>3 months</Text>, subject to performance and
            project requirements. During this period, you will be working closely with our development team and
            contributing to real-time projects that impact users.
          </Text>

          <Text>
            You will be expected to maintain confidentiality, professionalism, and dedication in all tasks assigned to
            you.
          </Text>

          <Text>
            Your performance during the internship will be evaluated, and based on your performance, a full-time
            opportunity at {COMPANY.name} may be offered.
          </Text>

          <Text>
            We believe this internship will be a valuable learning experience for you, and we look forward to your
            growth and meaningful contributions to <Text style={{ fontWeight: "bold" }}>{COMPANY.name}</Text>.
          </Text>

          <Text>Welcome aboard! We are excited to have you with us.</Text>

          <Text>Sincerely,</Text>
          <Text style={{ fontWeight: "bold" }}>Team {COMPANY.name}</Text>
          <Text>{COMPANY.name}</Text>
        </View>

        <View style={styles.footerBlock}>
          <View style={styles.footerGrid}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>Address</Text>
              {COMPANY.address.map((line) => (
                <Text key={line}>{line}</Text>
              ))}
              <Text>Onboarding Portal: onboard.localwala.tech</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>Email</Text>
              <Text>{COMPANY.email}</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>Contact</Text>
              <Text>{COMPANY.phone}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default InternshipLetterPdf;
