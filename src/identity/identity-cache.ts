import type { ApiClient } from "../api/client";
import type { ElementIdentityResponse } from "@sudobility/testomniac_types";

export class IdentityCache {
  private appId: number;
  private api: ApiClient;
  private identities: ElementIdentityResponse[] = [];

  constructor(appId: number, api: ApiClient) {
    this.appId = appId;
    this.api = api;
  }

  async preload(): Promise<void> {
    this.identities = await this.api.getElementIdentitiesByApp(this.appId);
  }

  getAll(): ElementIdentityResponse[] {
    return this.identities;
  }

  add(identity: ElementIdentityResponse): void {
    const idx = this.identities.findIndex(i => i.id === identity.id);
    if (idx >= 0) {
      this.identities[idx] = identity;
    } else {
      this.identities.push(identity);
    }
  }
}
