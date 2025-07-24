# Worthing High School Colts - Defensive Analytics Portal

## Overview

This is a full-stack web application for Worthing High School football defensive analytics. The system allows coaches to upload game data, analyze defensive performance metrics, visualize play patterns, and generate comprehensive reports to improve defensive strategies. Contact Jared Lewis at Jared.Lewis@houstonisd.org for questions or assistance.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### 2025-01-20 - Enhanced Analytics System with Momentum Chart Improvements
✓ Fixed AI Q&A to use actual loaded game data instead of generic responses
✓ Fixed PDF exports showing real defensive metrics (45.2% success rate) instead of N/A values  
✓ Fixed "All Games" option in Drive Analysis - now loads data correctly
✓ Added game selector to Explosives, Formations, and Situational pages for better data filtering
✓ Removed Scout Report and Clusters pages from navigation as requested
✓ Enhanced AI service to provide specific coaching recommendations using actual performance data
✓ Created comprehensive admin panel with authentication using login key "taylorswift13"
✓ Implemented passkey management system for changing team access codes
✓ Added file management with rename and delete functionality for uploaded game files
✓ Built target metrics configuration system for performance benchmarks
✓ Enhanced PDF reports with visual analytics placeholders and current performance indicators
✓ Added practice recommendations and coaching insights to exported reports
✓ Implemented proper database cascade deletion for admin file management
✓ Added admin section to sidebar navigation with secure access controls
✓ All 157 plays from uploaded games persist across server restarts with PostgreSQL
✓ System now provides real coaching value with authentic data analysis
✓ Implemented mobile-responsive design with collapsible sidebar and improved mobile layout
✓ Created Schedule page with color-coded opponent information and "Next Game" ticker based on current date
✓ Enhanced mobile UI with hamburger menu navigation and responsive breakpoints for all components
✓ Enhanced momentum swing index chart with game selection filtering and visual improvements
✓ Added color-coded momentum visualization (green for positive, red for negative values)
✓ Fixed momentum calculation to include sacks and TFLs (+1 point each) in both frontend and backend
✓ Added comprehensive tooltip explaining momentum scoring system and calculation method
✓ Implemented real-time momentum badge showing current cumulative score with trend indicators
✓ Fixed TypeScript errors and data flow issues for proper game-filtered momentum chart updates
✓ Conducted comprehensive metrics calculation audit and fixed mathematical accuracy issues
✓ Improved defensive success calculation robustness for games with incomplete down/distance data
✓ Fixed red zone TD percentage calculation to use drives instead of individual plays for accuracy
✓ Enhanced multi-game metrics handling with proper data filtering and aggregation
✓ Verified all core metrics calculations for mathematical correctness across single and multiple game scenarios
✓ Fixed game selection filtering issues across all dashboard components including explosive play analysis
✓ Added embedded Explosive Play Origins and Response Analysis cards to dashboard that update with game selection
✓ Fixed FieldHeatmap component to properly respond to game query parameters for filtering
✓ Implemented systematic game filtering fixes to ensure all dashboard visualizations update consistently
✓ Completed comprehensive audit and fix of all pages with game selection filtering issues
✓ Fixed API query parameter inconsistencies (game_id vs game_ids) across explosives, formations, situational, drives, clusters, and playbook pages
✓ Added game selector to playbook page for consistent filtering across all pages
✓ Resolved TypeScript errors in all component files for proper type safety

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **Styling**: TailwindCSS with shadcn/ui component library for consistent UI
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Charts/Visualization**: Plotly.js for interactive charts and D3.js for field heatmaps

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **File Processing**: Multer for multipart file uploads, XLSX library for spreadsheet parsing
- **API Design**: RESTful endpoints with standardized error handling

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured via Neon Database serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database migrations
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Data Ingestion Service
- Processes uploaded CSV/XLSX game files
- Normalizes column headers and maps synonyms (GAIN = GN/LS, YARDS = YDS, etc.)
- Derives calculated fields (down, distance, explosives, defensive success)
- Performs drive segmentation based on game flow
- Implements duplicate detection via content hashing

### Metrics Engine
- **Core Metrics**: Defensive success rate, havoc rate, stuff rate, third down efficiency
- **Novel Metrics**: Defensive stress index, explosive rate, momentum tracking
- **Caching Strategy**: Redis-like caching with invalidation on new uploads
- **Aggregation Levels**: Per-game, season, and filtered subsets

### Analytics Services
- **Clustering Service**: K-means clustering of play patterns for tactical analysis
- **Alerts Service**: Automated detection of performance anomalies and trends
- **Drive Analysis**: Comprehensive drive-by-drive breakdown and segmentation
- **Formation Analysis**: Opponent formation effectiveness tracking

### AI Integration
- **Summary Generation**: OpenAI GPT-4o for automated performance insights
- **Interactive Q&A**: Natural language queries about defensive performance
- **Fallback Responses**: Graceful degradation when AI services unavailable

### Reporting System
- **PDF Generation**: HTML-to-PDF conversion for scout reports
- **Export Functionality**: CSV/Excel export for external analysis
- **Template Engine**: Jinja2-style templating for consistent report formatting

## Data Flow

1. **Upload Flow**: Files → Multer → Ingest Service → Database → Cache Invalidation
2. **Analysis Flow**: Database → Metrics Service → Cache → Frontend API → React Components
3. **Visualization Flow**: API Data → Chart Components → Interactive Displays
4. **Export Flow**: Database → Report Service → PDF/HTML Generation → Download

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components foundation
- **multer**: File upload handling
- **xlsx**: Spreadsheet file processing

### Optional AI Dependencies
- **OpenAI**: AI-powered insights and summaries (graceful fallback if unavailable)

### Development Dependencies
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the application
- **TailwindCSS**: Utility-first styling
- **ESBuild**: Production bundling

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend
- tsx for TypeScript execution in development
- Integrated proxy for API requests

### Production Build
- Vite builds frontend to `dist/public`
- ESBuild bundles backend to `dist/index.js`
- Static file serving via Express
- Environment variable configuration for database and API keys

### Database Strategy
- PostgreSQL with connection pooling
- Drizzle migrations for schema management
- Environment-based configuration (DATABASE_URL)
- Graceful handling of missing environment variables

### Performance Considerations
- Metrics caching to reduce database load
- Lazy loading of chart libraries
- Pagination for large datasets
- Optimized bundle splitting