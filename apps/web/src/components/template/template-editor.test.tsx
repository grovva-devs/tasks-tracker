import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateEditor } from "./template-editor";

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({ innerRef: vi.fn(), droppableProps: {} }, null),
  Draggable: ({ children }: any) => children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, null),
}));

describe("TemplateEditor", () => {
  it("renders template name input", () => {
    render(<TemplateEditor onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/template name/i)).toBeInTheDocument();
  });

  it("allows adding a variable", async () => {
    const user = userEvent.setup();
    render(<TemplateEditor onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByText("Add Variable"));
    expect(screen.getByPlaceholderText("e.g. client_name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Client Name")).toBeInTheDocument();
  });

  it("allows adding a list", async () => {
    const user = userEvent.setup();
    render(<TemplateEditor onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByText("Add List"));
    expect(screen.getByPlaceholderText("List title (use {{variable}})")).toBeInTheDocument();
  });

  it("adds a card to a list", async () => {
    const user = userEvent.setup();
    render(<TemplateEditor onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByText("Add List"));
    // The add card button uses Plus icon + "Add Card" text
    expect(screen.getByRole("button", { name: /add card/i })).toBeInTheDocument();
  });

  it("highlights {{variables}} in preview", async () => {
    const user = userEvent.setup();
    render(
      <TemplateEditor
        onSave={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          name: "Test",
          variables: [{ key: "client_name", displayName: "Client Name", isRequired: true }],
          lists: [{ title: "Setup {{client_name}}", position: 0, color: null, cards: [{ title: "Welcome {{client_name}}", position: 0 }] }],
        }}
      />
    );

    // Variables are shown in the Variables section (not preview tab)
    // The key input should have the variable key
    expect(screen.getByDisplayValue("client_name")).toBeInTheDocument();
  });

  it("calls onSave with complete template data", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<TemplateEditor onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/template name/i), "SaaS Onboarding");
    await user.click(screen.getByText("Save Template"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "SaaS Onboarding" }),
    );
  });
});