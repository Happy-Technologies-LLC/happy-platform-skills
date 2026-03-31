# happy-servicenow-skills (DEPRECATED)

> **This package has been renamed to [`happy-platform-skills`](https://www.npmjs.com/package/happy-platform-skills).**

## Migration

```bash
npm uninstall happy-servicenow-skills
npm install happy-platform-skills
```

Then update your imports:

```diff
- import { SkillLoader } from 'happy-servicenow-skills';
+ import { SkillLoader } from 'happy-platform-skills';
```

And CLI usage:

```diff
- npx sn-skills list
+ npx hps list
```

The `sn-skills` CLI alias continues to work with the new package for backwards compatibility.
