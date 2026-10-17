# Snipo documentation

Snipo is a toolkit for snippet-based code generation. You define a generator
once: its inputs, the files it writes, and the source files it edits. Then you
run it from a terminal, from automation, or from another Node program with the
same inputs.

The docs are split by what you are trying to do.

| Document                                              | Read it when                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Getting started](./getting-started.md)               | You want a working generator in a fresh project.                                     |
| [Architecture and how it works](./architecture.md)    | You want to know the run pipeline, the discovery rules, and which libraries do what. |
| [Generators and actions](./generators-and-actions.md) | You are building a generator and need the prompt, action, and template reference.    |
| [Programmatic API](./programmatic-api.md)             | You are embedding the engine in another tool instead of shelling out to the CLI.     |
| [For AI agents](./for-ai-agents.md)                   | You are an agent that must create generators and generate code non-interactively.    |

If you only have five minutes, read [Getting started](./getting-started.md) and
run the component example.
