# Commit Process Guidelines

## Version Management

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner  
- **PATCH** version for backwards compatible bug fixes

## Commit Workflow

When making commits, follow these steps:

### 1. Update Version
Update the version in `package.json`:
```bash
# For bug fixes
"version": "0.1.1"  # Increment patch

# For new features
"version": "0.2.0"  # Increment minor

# For breaking changes
"version": "1.0.0"  # Increment major
```

### 2. Update CHANGELOG
Add entry to `CHANGELOG.md` with:
- Version number and date
- Categories: Added, Changed, Fixed, Removed
- Clear descriptions of changes
- File paths modified

### 3. Update Documentation
Ensure all docs are current:
- `README.md` - Update version badge
- `docs/DEVELOPMENT_NOTES.md` - Add recent updates section
- `docs/CONVERSATION_SUMMARY.md` - Document implementation details
- Any affected technical documentation

### 4. Commit Message Format
Use conventional commits:
```
type: Subject line (version)

- Bullet point descriptions
- Of changes made
- Reference issues if applicable
```

Types:
- `fix:` Bug fixes
- `feat:` New features
- `docs:` Documentation only
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process/auxiliary tool changes

### 5. Example Commit
```bash
# Stage changes
git add .

# Commit with message
git commit -m "fix: Correct FIA workflow to present verse before questions (v0.1.0)

- Updated system prompt with comprehensive FIA methodology
- Fixed workflow to show verse text BEFORE asking questions  
- Changed questions from thematic to comprehension-based
- Implemented proper phrase-by-phrase progression tracking"
```

## Automated Checks

Before committing:
1. Run build: `npm run build`
2. Check linting: `npm run lint` (if configured)
3. Test locally: `npm run dev:netlify`
4. Verify no console errors

## Post-Commit

After committing:
1. Push to GitHub: `git push origin main`
2. Check Netlify deployment status
3. Test deployed version
4. Update project management tools if applicable
