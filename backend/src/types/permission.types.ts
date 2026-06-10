export interface PermissionCreateInput {
  resource: string;
  action: string;
}

export interface PermissionResponse {
  id: string;
  resource: string;
  action: string;
}

export interface PermissionUpdateInput {
  resource?: string;
  action?: string;
}
