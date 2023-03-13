# Disable built-in rules and variables. Sanity please!
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-builtin-variables
.SUFFIXES:

PYTHON = .python/pyvenv.cfg

TARGETS = \
	$(PYTHON)

$(PYTHON): dev_requirements.txt requirements.txt
	rm -rf .python
	python3 -m venv .python
	.python/bin/python3 -m pip install -r dev_requirements.txt

.PHONY: test format

test: $(PYTHON)
	.python/bin/python3 -m unittest

format: $(PYTHON)
	.python/bin/python3 -m black .

