import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("PublicNavbar", () => {
  it("renders the brand name", () => {
    renderWithProviders(<PublicNavbar />);
    expect(screen.getByText("FXA")).toBeInTheDocument();
    expect(screen.getByText("Trade")).toBeInTheDocument();
  });

  it("renders Sign In and Open Account links", () => {
    renderWithProviders(<PublicNavbar />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Open Account")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    renderWithProviders(<PublicNavbar />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Markets")).toBeInTheDocument();
    expect(screen.getByText("Bots")).toBeInTheDocument();
  });
});
