import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "@/hooks/useForm";

describe("useForm", () => {
  const initialValues = { name: "", email: "" };
  const validate = (v: typeof initialValues) => {
    const e: Record<string, string> = {};
    if (!v.name) e.name = "Name required";
    if (!v.email) e.email = "Email required";
    return e;
  };

  it("returns initial values", () => {
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit: async () => {} }),
    );
    expect(result.current.values).toEqual(initialValues);
  });

  it("updates values on change", () => {
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit: async () => {} }),
    );
    act(() => {
      result.current.handleChange({
        target: { name: "name", value: "John" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.values.name).toBe("John");
  });

  it("validates on submit", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit }),
    );
    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(result.current.errors.name).toBe("Name required");
    expect(result.current.errors.email).toBe("Email required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit when valid", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues: { name: "John", email: "john@test.com" }, validate, onSubmit }),
    );
    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(Object.keys(result.current.errors)).toHaveLength(0);
    expect(onSubmit).toHaveBeenCalled();
  });
});
