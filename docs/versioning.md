# How versions work

## Version numbers
Versions follow [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

| Change | Bump | Example |
|---|---|---|
| A rebuild, or a change that breaks how the app is used or configured | MAJOR | 0.3.0 to 1.0.0 (full rebuild) |
| A new feature or a visible improvement | MINOR | 1.3.0 to 1.4.0 (room details panel) |
| A bug fix or a wording change only | PATCH | 1.4.0 to 1.4.1 |

The current version lives in three places, which must always match: `package.json`, the top of `CHANGELOG.md`, and the **Current version** line in `README.md`.

## Every release, in order
1. Change the code and test it.
2. Update `CHANGELOG.md`: move the items under [Unreleased] into a new section `## [x.y.z] - YYYY-MM-DD`, grouped as Added, Changed, Fixed, Removed or Security. Write each line for a reader, saying what changed and why.
3. Bump the version in `package.json` and in the README.
4. Add a decision record in `docs/decisions/` if the release involved a real choice with trade-offs.
5. Commit with a message like `v1.5.0: add price history chart`.
6. Create a GitHub release (below).

## Creating a GitHub release (web only, no command line)
1. In the repo, click Releases in the right-hand column, then Draft a new release.
2. Click Choose a tag, type the version with a `v` in front (for example `v1.5.0`) and click Create new tag.
3. Release title: `v1.5.0: short summary`.
4. Description: paste that version's section from `CHANGELOG.md`.
5. Click Publish release.

GitHub then keeps a downloadable snapshot of the code for that version, and the release list becomes the app's public history.

## Commit messages
Start with what changed, in the present tense: `Add room details panel`, `Fix photo viewer closing the hotel window`, `Docs: case study findings`.
