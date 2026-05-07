import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
} from "@react-email/components";

interface CardCompletedEmailProps {
  clientName: string;
  cardTitle: string;
  boardTitle: string;
  primaryColor?: string;
}

export default function CardCompletedEmail({
  clientName,
  cardTitle,
  boardTitle,
}: CardCompletedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#F3F4F6", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Section style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", padding: "32px" }}>
            <Heading style={{ color: "#111827", fontSize: "24px", marginBottom: "16px" }}>
              ✅ Card Concluído
            </Heading>
            <Text style={{ color: "#374151", fontSize: "16px", lineHeight: "1.5", marginBottom: "16px" }}>
              Olá <strong>{clientName}</strong>,
            </Text>
            <Text style={{ color: "#374151", fontSize: "16px", lineHeight: "1.5", marginBottom: "24px" }}>
              O card <strong>{cardTitle}</strong> do quadro <strong>{boardTitle}</strong> foi concluído.
            </Text>
            <Text style={{ color: "#6B7280", fontSize: "14px", marginTop: "24px" }}>
              Obrigado por escolher nossa plataforma!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
