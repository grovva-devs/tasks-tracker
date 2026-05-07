import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
} from "@react-email/components";

interface BoardCreatedEmailProps {
  clientName: string;
  boardTitle: string;
  boardLink: string | null;
  primaryColor?: string;
}

export default function BoardCreatedEmail({
  clientName,
  boardTitle,
  boardLink,
  primaryColor = "#3B82F6",
}: BoardCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#F3F4F6", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Section style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", padding: "32px" }}>
            <Heading style={{ color: "#111827", fontSize: "24px", marginBottom: "16px" }}>
              🎉 Onboarding Iniciado!
            </Heading>
            <Text style={{ color: "#374151", fontSize: "16px", lineHeight: "1.5", marginBottom: "16px" }}>
              Olá <strong>{clientName}</strong>,
            </Text>
            <Text style={{ color: "#374151", fontSize: "16px", lineHeight: "1.5", marginBottom: "24px" }}>
              Seu quadro de onboarding <strong>{boardTitle}</strong> foi criado.
            </Text>
            {boardLink && (
              <Button
                href={boardLink}
                style={{
                  backgroundColor: primaryColor,
                  color: "#FFFFFF",
                  padding: "12px 24px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  display: "inline-block",
                  fontSize: "16px",
                }}
              >
                Acompanhar Progresso
              </Button>
            )}
            <Text style={{ color: "#6B7280", fontSize: "14px", marginTop: "24px" }}>
              Obrigado por escolher nossa plataforma!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
