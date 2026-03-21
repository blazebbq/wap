import { parseBlocks, BlocksArraySchema } from "@/lib/blocks";

describe("parseBlocks", () => {
  it("parses valid hero block", () => {
    const input = [
      {
        id: "block-1",
        type: "hero",
        props: {
          heading: "Welcome",
          subheading: "Hello world",
          ctaText: "Book Now",
          ctaHref: "/book",
        },
      },
    ];
    const result = parseBlocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("hero");
    if (result[0].type === "hero") {
      expect(result[0].props.heading).toBe("Welcome");
    }
  });

  it("parses valid services block", () => {
    const input = [
      {
        id: "block-2",
        type: "services",
        props: {
          title: "Our Services",
          serviceIds: ["svc-1", "svc-2"],
          showPrices: true,
        },
      },
    ];
    const result = parseBlocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("services");
  });

  it("parses valid contact block", () => {
    const input = [
      {
        id: "block-3",
        type: "contact",
        props: {
          phone: "+44 20 7946 0958",
          email: "hello@example.com",
          address: "123 Street",
          mapEnabled: false,
        },
      },
    ];
    const result = parseBlocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("contact");
  });

  it("returns empty array for invalid blocks", () => {
    const result = parseBlocks("not an array");
    expect(result).toEqual([]);
  });

  it("returns empty array for blocks with invalid type", () => {
    const input = [{ id: "x", type: "unknown", props: {} }];
    const result = parseBlocks(input);
    expect(result).toEqual([]);
  });

  it("applies defaults for missing optional hero fields", () => {
    const input = [
      {
        id: "block-4",
        type: "hero",
        props: { heading: "Hello" },
      },
    ];
    const result = parseBlocks(input);
    expect(result).toHaveLength(1);
    if (result[0].type === "hero") {
      expect(result[0].props.subheading).toBe("");
      expect(result[0].props.ctaText).toBe("");
    }
  });

  it("parses multiple blocks of different types", () => {
    const input = [
      {
        id: "b1",
        type: "hero",
        props: { heading: "H1" },
      },
      {
        id: "b2",
        type: "richText",
        props: { html: "<p>Hello</p>" },
      },
    ];
    const result = parseBlocks(input);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("hero");
    expect(result[1].type).toBe("richText");
  });
});

describe("BlocksArraySchema", () => {
  it("validates an empty array", () => {
    const result = BlocksArraySchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("rejects hero block without heading", () => {
    const result = BlocksArraySchema.safeParse([
      { id: "b1", type: "hero", props: {} },
    ]);
    expect(result.success).toBe(false);
  });
});
