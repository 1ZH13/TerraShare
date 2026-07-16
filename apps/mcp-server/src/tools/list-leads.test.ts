import { describe, expect, it } from "bun:test";
import { listLeads } from "./list-leads";

describe("list_leads tool (HU-89 #204)", () => {
  it("devuelve los leads sembrados, ordenados por createdAt descendente", async () => {
    const res = await listLeads({});
    expect(res.items.length).toBe(3);
    const dates = res.items.map((l) => new Date(l.createdAt as string).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("paginación: pageSize=2, page=1 devuelve 2 items", async () => {
    const res = await listLeads({ pageSize: 2, page: 1 });
    expect(res.items.length).toBe(2);
    expect(res.pagination.totalItems).toBe(3);
    expect(res.pagination.totalPages).toBe(2);
  });

  it("paginación: page=2 devuelve el último lead", async () => {
    const res = await listLeads({ pageSize: 2, page: 2 });
    expect(res.items.length).toBe(1);
    expect(res.pagination.totalItems).toBe(3);
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const res = await listLeads({});
    expect(res.items.every((l) => !("_id" in l) && !("__v" in l))).toBe(true);
  });

  it("cada item tiene id, email, source y createdAt", async () => {
    const res = await listLeads({});
    for (const item of res.items) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("email");
      expect(item).toHaveProperty("source");
      expect(item).toHaveProperty("createdAt");
    }
  });
});
