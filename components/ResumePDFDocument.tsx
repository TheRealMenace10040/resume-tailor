import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { BaseResume, TailoredResumeResult } from '@/lib/types';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    marginBottom: 12,
    textAlign: 'center',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 9,
    color: '#475569',
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
    marginBottom: 6,
  },
  summaryText: {
    lineHeight: 1.4,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    fontSize: 9,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
  experienceItem: {
    marginBottom: 8,
  },
  experienceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
  },
  companyText: {
    fontSize: 10,
    color: '#334155',
  },
  dateText: {
    fontSize: 9,
    color: '#64748b',
  },
  bullet: {
    flexDirection: 'row',
    marginTop: 2,
  },
  bulletDot: {
    width: 10,
  },
  bulletText: {
    flex: 1,
    lineHeight: 1.35,
  },
  educationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
});

interface ResumePDFDocumentProps {
  resume: BaseResume;
  tailoredResult?: TailoredResumeResult | null;
}

export function ResumePDFDocument({ resume, tailoredResult }: ResumePDFDocumentProps) {
  const summary = tailoredResult?.tailoredSummary || resume.summary;

  const orderedSkills = tailoredResult?.highlightedSkills?.length
    ? [
        ...tailoredResult.highlightedSkills,
        ...resume.skills.filter((s) => !tailoredResult.highlightedSkills.includes(s)),
      ]
    : resume.skills;

  const bulletOverrides = new Map<string, string>();
  tailoredResult?.recommendedBullets.forEach((b) => {
    bulletOverrides.set(`${b.roleId}::${b.originalBullet}`, b.tailoredBullet);
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{resume.contact.name}</Text>
          <View style={styles.contactRow}>
            <Text>{resume.contact.email}</Text>
            {resume.contact.phone && <Text>{resume.contact.phone}</Text>}
            {resume.contact.location && <Text>{resume.contact.location}</Text>}
            {resume.contact.links.map((link) => (
              <Link key={link.url} src={link.url} style={{ color: '#2563eb' }}>
                {link.label}
              </Link>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsRow}>
            {orderedSkills.map((skill) => (
              <Text key={skill} style={styles.skillChip}>
                {skill}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {resume.experience.map((exp) => (
            <View key={exp.id} style={styles.experienceItem} wrap={false}>
              <View style={styles.experienceHeaderRow}>
                <Text style={styles.roleTitle}>{exp.role}</Text>
                <Text style={styles.dateText}>
                  {exp.startDate} – {exp.endDate}
                </Text>
              </View>
              <Text style={styles.companyText}>{exp.company}</Text>
              {exp.bullets.map((bullet, idx) => {
                const tailored = bulletOverrides.get(`${exp.id}::${bullet}`);
                return (
                  <View key={idx} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{tailored || bullet}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {resume.education.map((edu, idx) => (
            <View key={idx} style={styles.educationItem}>
              <Text>
                {edu.degree}, {edu.institution}
              </Text>
              <Text style={styles.dateText}>{edu.graduationYear}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
