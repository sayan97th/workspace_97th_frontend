# Tests

Every frontend test lives here, in a folder that mirrors where the code under test lives in `src/`.

| Folder | Covers |
| --- | --- |
| `board/table/` | The table engine: `treeUtils`, `useBoardTable` (row menu state and callbacks), `BoardTable` wired to the row menu |
| `board/table/menus/` | `RowMenu` and its rules |
| `board/table/formula/` | The formula engine |
| `workspace-nav/` | The pure tree helpers behind `TableBoardView` (`boardItemTree`) |
| `services/` | API service contracts (URL, verb and body of every request) |
| `lib/` | Shared helpers such as `getApiErrorMessage` |
| `components/` | Shared UI components |
| `support/` | Fixtures shared by several tests, never tests themselves |

Name a test `<thing under test>.test.ts` (or `.test.tsx` when it renders), and put it in the folder that matches its source.

```bash
yarn test          # watch mode
yarn test:run      # single run
yarn test:run test/board/table/menus   # one folder
```

The setup file `vitest.setup.ts` stubs what jsdom and Next.js do not provide (observers, `matchMedia`, `localStorage`, `next/font/google`).

The Laravel API keeps its Pest tests in `workspace_97th_api/tests/`, grouped by feature (`tests/Feature/Board/...`).
