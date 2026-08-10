import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validateBody, validateQuery } from "../middleware/validate";
import { Request, Response } from "express";

describe("Validate Middleware", () => {
  const dummySchema = z.object({
    name: z.string().min(3),
    game_type: z.string().optional(),
  });

  it("should pass validation for valid body payload", () => {
    const req = { body: { name: "Splatoon Open", game_type: "SPLATOON_3" } } as Request;
    const res = {} as Response;
    const next = vi.fn();

    validateBody(dummySchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Splatoon Open", game_type: "SPLATOON_3" });
  });

  it("should reject invalid body payload with 400 status", () => {
    const req = { body: { name: "Ab" } } as Request; // length < 3
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;
    const next = vi.fn();

    validateBody(dummySchema)(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation Error",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
