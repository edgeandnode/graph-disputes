# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Graph Disputes CLI - a command-line tool for managing disputes in The Graph Protocol network. It facilitates creating and resolving disputes for wrong indexing proofs and bad query responses, handling significant financial stakes (10,000 GRT deposits).

## Development Commands

### Package Manager
This project uses **pnpm** (not npm or yarn).

### Essential Commands
```bash
# Install dependencies
pnpm install

# Build the project (required before running)
pnpm compile

# Lint and format check
pnpm lint
pnpm format

# Full build pipeline (format + lint + compile)
pnpm prepare

# Clean build artifacts
pnpm clean
```

### Running the CLI Locally
```bash
# After building, run the CLI
node dist/index.js [command]

# Or use the binary directly
./bin/graph-disputes [command]
```

### Testing
**IMPORTANT**: This project currently has no test suite. When implementing new features, consider the financial implications (10k GRT deposits) and thoroughly test manually.

## Architecture Overview

### Command Structure
The CLI uses yargs for command parsing. All commands are in `src/commands/`:
- `setup.ts` - Initial configuration wizard
- `create.ts` - Create disputes (indexing/query)
- `list.ts` - List disputes with filtering
- `show.ts` - Display dispute details
- `resolve.ts` - Arbitration commands (accept/reject/draw)
- `inspect.ts` - Debug dispute data

### Core Modules
- `src/network.ts` - Ethereum contract interactions via ethers.js
- `src/dispute.ts` - Dispute data formatting and validation
- `src/model.ts` - GraphQL queries to network subgraph
- `src/resolver.ts` - Dispute resolution logic
- `src/poi.ts` - Proof of Indexing utilities
- `src/config.ts` - Configuration management

### Contract Integration
The CLI interacts with the DisputeManager contract on Ethereum. Key operations:
- Creating indexing disputes (requires allocationID)
- Creating query disputes (requires attestation bytes)
- Resolving disputes (arbitrator only)

### Data Flow
1. User input → Yargs command parsing
2. Command validation → Check contract state via ethers
3. Query network subgraph for additional data
4. Execute transaction or display results
5. Store minimal state in local config

## Key Development Considerations

### Financial Safety
- All dispute creation requires 10,000 GRT deposit
- Accepted disputes slash 2.5% of indexer stake
- Double-check all transaction parameters before submission

### Validation Rules
The CLI enforces:
- Double Jeopardy: No re-disputing resolved allocations
- Statute of Limitations: Time limits on disputes
- Data Availability: Subgraph files must be accessible

### Network Configuration
The CLI supports multiple networks (mainnet, testnet). Configuration includes:
- Ethereum RPC URL
- Network subgraph endpoint  
- Trusted POI query endpoint
- Private key (for creating disputes)

### Error Handling
- Network errors should be caught and displayed clearly
- Invalid inputs must be validated before contract calls
- Transaction failures need user-friendly explanations

## Code Style

- TypeScript with ES2020 target
- No semicolons, single quotes, 2-space indentation
- Minimal comments, self-documenting code
- Follow existing patterns in neighboring files