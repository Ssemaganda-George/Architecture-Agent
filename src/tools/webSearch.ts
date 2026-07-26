export class WebSearchTool {
  private apiUrl?: string;
  private apiKey?: string;

  constructor() {
    this.apiUrl = process.env.SEARCH_API_URL;
    this.apiKey = process.env.SEARCH_API_KEY;
  }

  async search(query: string): Promise<string> {
    if (!this.apiUrl || !this.apiKey) {
      return `Web search disabled. Configure SEARCH_API_URL and SEARCH_API_KEY to enable external sourcing for: ${query}`;
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const body = await response.text();
      return `Search API error: ${response.status} ${body}`;
    }

    const result = await response.json();
    return result?.results?.map((item: any) => item.snippet).join("\n") ?? "No search snippets found.";
  }
}
