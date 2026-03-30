# Zovibe — backend entities (MockAPI)

Base URL is configured in `src/constants/api.ts` (`MOCKAPI_BASE`). Under that project, create these resources and **exact field names** (camelCase).

| Document | Resource path | File |
|----------|---------------|------|
| User accounts | `/users` | [USER.md](./USER.md) |
| User playlists | `/playlists` | [PLAYLIST.md](./PLAYLIST.md) |

**Migration note:** If you already have `/users` without `name`, add a **String** column `name` in the MockAPI dashboard. Existing rows can be edited manually or left empty; the app falls back to `username` for display until `name` is set.
