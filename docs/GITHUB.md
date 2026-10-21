# Publishing to your personal GitHub

The approved repository is **joanmoturi/jojobuilds**, with **private** visibility:
<https://github.com/joanmoturi/jojobuilds>.
This checkout uses a repository-local GitHub no-reply author email, not a work
email. Changing source or visibility does not deploy the application.

Source publication and deployment are separate. Confirm the **personal account**,
repository name and visibility before the first push. Start private while security
and privacy release blockers remain. Choose a license before any public release.

Review ignored content before staging:

```powershell
git status --short
git check-ignore apps\api\data\jojobuilds.db apps\api\.env
gh auth status
```

Do not include statements, databases, uploads, local `.env` files, signing
credentials, backups or real tenant fixtures. Review every staged file.
The generated OpenAPI/type files and dependency locks should be tracked.

For an existing checkout with a verified `origin`, publish reviewed adjustments:

```powershell
git status --short
git diff
git add README.md docs
git diff --cached --stat
git diff --cached
git commit -m "Update JOJOBUILDS documentation"
git push origin main
```

This example stages documentation only. Stage other files intentionally, review
them and run the checks appropriate to each change. Do not use `--force` to resolve
a rejected push; fetch and reconcile the remote changes first.

If no remote exists, create it only with explicit authorization and the verified
personal account. Do not inadvertently publish to an employer organization,
recreate an existing repository or change visibility.

A GitHub repository does not host the running FastAPI/PostgreSQL application.
Website deployment, mobile APK distribution, signing and store release are
separate actions and require separate approval. Choose a license before a public
source release; no license has been selected for you.
