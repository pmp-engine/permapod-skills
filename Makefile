.PHONY: build test lint format check surface drift-check eval release-check clean

# === Build & Test ===

build:
	yarn build

test:
	yarn test

lint:
	yarn lint

format:
	yarn format:fix

# === Release Checks ===

# Generate .surface file from current CLI
surface: build
	bash scripts/generate-surface.sh > .surface.new
	@if diff -q .surface .surface.new > /dev/null 2>&1; then \
		rm .surface.new; \
		echo "Surface unchanged"; \
	else \
		mv .surface.new .surface; \
		echo "Surface updated — review and commit .surface"; \
	fi

# Check SKILL.md is in sync with .surface
drift-check:
	bash scripts/check-skill-drift.sh

# Validate eval case files
eval:
	bash skill-evals/run.sh

# Run all release checks
release-check: build test lint drift-check eval
	@echo ""
	@echo "========================================="
	@echo "  All release checks passed"
	@echo "========================================="

# === Utilities ===

clean:
	rm -rf build/ coverage/

# Show help
help:
	@echo "Available targets:"
	@echo "  build          Build TypeScript"
	@echo "  test           Run unit tests"
	@echo "  lint           Run ESLint"
	@echo "  format         Auto-format with Prettier"
	@echo "  surface        Regenerate .surface from CLI"
	@echo "  drift-check    Verify SKILL.md matches .surface"
	@echo "  eval           Validate eval cases"
	@echo "  release-check  Run all checks (build + test + lint + drift + eval)"
	@echo "  clean          Remove build artifacts"
