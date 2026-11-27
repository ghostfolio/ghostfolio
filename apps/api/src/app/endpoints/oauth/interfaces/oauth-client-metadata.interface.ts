export interface OAuthClientMetadata {
  client_id: string;
  client_name: string;
  grant_types: string[];
  redirect_uris: string[];
  response_types: string[];
  token_endpoint_auth_method?: string;
}
