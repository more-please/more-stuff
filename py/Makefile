# Disable built-in rules and variables. Sanity please!
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-builtin-variables
.SUFFIXES:

ENV = env
PYTHON3 = $(ENV)/bin/python3

TARGETS = $(PYTHON3)

all: $(TARGETS)

$(PYTHON3): $(ENV)

$(ENV): dev_requirements.txt
	rm -rf $@
	python3 -m venv $@
	$(PYTHON3) -m pip install -r dev_requirements.txt

.PHONY: clean test format

clean:
	rm -rf $(ENV)

test: $(PYTHON3)
	$(PYTHON3) -m unittest

format: $(PYTHON3)
	$(PYTHON3) -m black .
