import type {
  alphaVantageCryptoTool,
  alphaVantageStockTool,
  alphaVantageTool,
  amazonSearchTool,
  arxivPaperDownloaderTool,
  arxivPdfParserTool,
  arxivTool,
  browserTool,
  calculatorTool,
  chartDataProcessorTool,
  chartGeneratorTool,
  chartSupervisorTool,
  chartTypeAdvisorTool,
  clickAndExtractTool,
  colorChangeTool,
//  copywriterTool,
  csvToJsonTool,
  documentRerankerTool,
  editorTool,
  evaluateResultTool,
  extractLearningsTool,
  extractTablesTool,
  fetchTool,
  fillFormTool,
  findFreeSlots,
  finnhubAnalysisTool,
  finnhubCompanyTool,
  finnhubEconomicTool,
  finnhubFinancialsTool,
  finnhubQuotesTool,
  finnhubTechnicalTool,
  getTodayEvents,
  getUpcomingEvents,
  googleAiOverviewTool,
  googleAutocompleteTool,
  googleFinanceTool,
  googleNewsLiteTool,
  googleNewsTool,
  googleScholarTool,
  googleSearch,
  googleSearchTool,
  googleTrendsTool,
  homeDepotSearchTool,
  jsonToCsvTool,
  jwtAuthTool,
  listEvents,
  mastraChunker,
  matrixCalculatorTool,
  mdocumentChunker,
  monitorPageTool,
  pdfGeneratorTool,
  polygonCryptoAggregatesTool,
  polygonCryptoQuotesTool,
  polygonStockAggregatesTool,
  polygonStockFundamentalsTool,
  polygonStockQuotesTool,
  polygonCryptoSnapshotsTool,
  coinbaseExchangeMarketDataTool,
  yahooFinanceStockQuotesTool,
  scheduledFetchTool,
  stooqStockQuotesTool,
  urlValidationTool,
  urlManipulationTool,
  textAnalysisTool,
  textProcessingTool,
  dateTimeTool,
  timeZoneTool,
  chartJsTool,
  cytoscapeTool,
  downsampleTool,
  discordWebhookTool,
  leafletTool,
  //ocrTool,
  //imageProcessorTool,
  //imageToMarkdownTool,
  randomGeneratorTool,
  spatialIndexTool,
  binanceSpotMarketDataTool,
  walmartSearchTool,
  ebaySearchTool,
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  gitLogTool,
  gitBranchTool,
  gitStashTool,
  gitConfigTool,
  ichimokuCloudTool,
  fibonacciTool,
  pivotPointsTool,
  trendAnalysisTool,
  momentumAnalysisTool,
  volatilityAnalysisTool,
  volumeAnalysisTool,
  statisticalAnalysisTool,
  heikinAshiTool,
  marketSummaryTool,
  candlestickPatternTool,
  technicalAnalysisTool,
  readPDF,
  screenshotTool,
  unitConverterTool,
  weatherTool,
  writeNoteTool,
  yelpSearchTool,
} from '@/src/mastra/tools'
import type {
  addIssueComment,
  createIssue,
  createPullRequest,
  createRelease,
  getFileContent,
  getIssue,
  getPullRequest,
  getRepoFileTree,
  getRepositoryInfo,
  listCommits,
  listIssues,
  listPullRequests,
  listRepositories,
  mergePullRequest,
  searchCode,
} from '@/src/mastra/tools/github'
import type { InferUITool } from '@mastra/core/tools'


//export type ActiveDistTagUITool = InferUITool<typeof activeDistTag>
export type AddIssueCommentUITool = InferUITool<typeof addIssueComment>
export type AlphaVantageCryptoUITool = InferUITool<
  typeof alphaVantageCryptoTool
>
export type AlphaVantageStockUITool = InferUITool<typeof alphaVantageStockTool>
export type AlphaVantageUITool = InferUITool<typeof alphaVantageTool>
export type AmazonSearchUITool = InferUITool<typeof amazonSearchTool>
export type ArxivPaperDownloaderUITool = InferUITool<
  typeof arxivPaperDownloaderTool
>
export type ArxivPdfParserUITool = InferUITool<typeof arxivPdfParserTool>
export type ArxivUITool = InferUITool<typeof arxivTool>
export type BrowserUITool = InferUITool<typeof browserTool>
export type ChartDataProcessorUITool = InferUITool<
  typeof chartDataProcessorTool
>
export type ChartGeneratorUITool = InferUITool<typeof chartGeneratorTool>
export type ChartSupervisorUITool = InferUITool<typeof chartSupervisorTool>
export type ChartTypeAdvisorUITool = InferUITool<typeof chartTypeAdvisorTool>
export type ClickAndExtractUITool = InferUITool<typeof clickAndExtractTool>
export type ColorChangeUITool = InferUITool<typeof colorChangeTool>
//export type CopywriterUITool = InferUITool<typeof copywriterTool>
export type CreateIssueUITool = InferUITool<typeof createIssue>
export type CreatePullRequestUITool = InferUITool<typeof createPullRequest>
export type CreateReleaseUITool = InferUITool<typeof createRelease>
export type CsvToJsonUITool = InferUITool<typeof csvToJsonTool>
export type DocumentRerankerUITool = InferUITool<typeof documentRerankerTool>
export type EditorUITool = InferUITool<typeof editorTool>
export type EvaluateResultUITool = InferUITool<typeof evaluateResultTool>
export type ExtractLearningsUITool = InferUITool<typeof extractLearningsTool>
export type ExtractTablesUITool = InferUITool<typeof extractTablesTool>
export type FetchUITool = InferUITool<typeof fetchTool>
export type FillFormUITool = InferUITool<typeof fillFormTool>
export type FindFreeSlotsUITool = InferUITool<typeof findFreeSlots>
export type FinnhubAnalysisUITool = InferUITool<typeof finnhubAnalysisTool>
export type FinnhubCompanyUITool = InferUITool<typeof finnhubCompanyTool>
export type FinnhubEconomicUITool = InferUITool<typeof finnhubEconomicTool>
export type FinnhubFinancialsUITool = InferUITool<typeof finnhubFinancialsTool>
export type FinnhubQuotesUITool = InferUITool<typeof finnhubQuotesTool>
export type FinnhubTechnicalUITool = InferUITool<typeof finnhubTechnicalTool>
export type GetFileContentUITool = InferUITool<typeof getFileContent>
export type GetIssueUITool = InferUITool<typeof getIssue>
export type GetPullRequestUITool = InferUITool<typeof getPullRequest>
export type GetRepoFileTreeUITool = InferUITool<typeof getRepoFileTree>
export type GetRepositoryInfoUITool = InferUITool<typeof getRepositoryInfo>
export type GetTodayEventsUITool = InferUITool<typeof getTodayEvents>
export type GetUpcomingEventsUITool = InferUITool<typeof getUpcomingEvents>
export type GoogleAiOverviewUITool = InferUITool<typeof googleAiOverviewTool>
export type GoogleAutocompleteUITool = InferUITool<
  typeof googleAutocompleteTool
>
export type GoogleFinanceUITool = InferUITool<typeof googleFinanceTool>
export type GoogleNewsLiteUITool = InferUITool<typeof googleNewsLiteTool>
export type GoogleNewsUITool = InferUITool<typeof googleNewsTool>
export type GoogleScholarUITool = InferUITool<typeof googleScholarTool>
export type GoogleSearchUITool = InferUITool<typeof googleSearch>
export type GoogleSearchToolUITool = InferUITool<typeof googleSearchTool>
export type GoogleTrendsUITool = InferUITool<typeof googleTrendsTool>
export type HomeDepotSearchUITool = InferUITool<typeof homeDepotSearchTool>
//export type ImageToCSVUITool = InferUITool<typeof imageToCSVTool>
export type JsonToCsvUITool = InferUITool<typeof jsonToCsvTool>
export type JwtAuthUITool = InferUITool<typeof jwtAuthTool>
export type ListCommitsUITool = InferUITool<typeof listCommits>
export type ListEventsUITool = InferUITool<typeof listEvents>
export type ListIssuesUITool = InferUITool<typeof listIssues>
export type ListPullRequestsUITool = InferUITool<typeof listPullRequests>
export type ListRepositoriesUITool = InferUITool<typeof listRepositories>
export type MastraChunkerUITool = InferUITool<typeof mastraChunker>
export type MdocumentChunkerUITool = InferUITool<typeof mdocumentChunker>
export type MergePullRequestUITool = InferUITool<typeof mergePullRequest>
export type MonitorPageUITool = InferUITool<typeof monitorPageTool>
export type PdfGeneratorUITool = InferUITool<typeof pdfGeneratorTool>
export type PolygonCryptoAggregatesUITool = InferUITool<
  typeof polygonCryptoAggregatesTool
>
export type PolygonCryptoQuotesUITool = InferUITool<
  typeof polygonCryptoQuotesTool
>
export type PolygonStockAggregatesUITool = InferUITool<
  typeof polygonStockAggregatesTool
>
export type PolygonStockFundamentalsUITool = InferUITool<
  typeof polygonStockFundamentalsTool
>
export type PolygonStockQuotesUITool = InferUITool<
  typeof polygonStockQuotesTool
>
export type PolygonCryptoSnapshotsUITool = InferUITool<
  typeof polygonCryptoSnapshotsTool
>
export type CoinbaseExchangeMarketDataUITool = InferUITool<
  typeof coinbaseExchangeMarketDataTool
>
export type YahooFinanceStockQuotesUITool = InferUITool<
  typeof yahooFinanceStockQuotesTool
>
export type ScheduledFetchUITool = InferUITool<
  typeof scheduledFetchTool
>

export type ReadPDFUITool = InferUITool<typeof readPDF>
export type CalculatorUITool = InferUITool<typeof calculatorTool>
export type UnitConverterUITool = InferUITool<typeof unitConverterTool>
export type MatrixCalculatorUITool = InferUITool<typeof matrixCalculatorTool>
export type ScreenshotUITool = InferUITool<typeof screenshotTool>
export type SearchCodeUITool = InferUITool<typeof searchCode>
export type WeatherUITool = InferUITool<typeof weatherTool>
export type WriteNoteUITool = InferUITool<typeof writeNoteTool>
export type YelpSearchUITool = InferUITool<typeof yelpSearchTool>
export type BinanceSpotMarketDataUITool = InferUITool<typeof binanceSpotMarketDataTool>
export type ChartJsUITool = InferUITool<typeof chartJsTool>
export type CytoscapeUITool = InferUITool<typeof cytoscapeTool>
export type DownsampleUITool = InferUITool<typeof downsampleTool>
export type DiscordWebhookUITool = InferUITool<typeof discordWebhookTool>
export type DateTimeUITool = InferUITool<typeof dateTimeTool>
export type TimeZoneUITool = InferUITool<typeof timeZoneTool>
//export type OcrUITool = InferUITool<typeof ocrTool>
//export type ImageProcessorUITool = InferUITool<typeof imageProcessorTool>
//export type ImageToMarkdownUITool = InferUITool<typeof imageToMarkdownTool>
export type GitStatusUITool = InferUITool<typeof gitStatusTool>
export type GitDiffUITool = InferUITool<typeof gitDiffTool>
export type GitCommitUITool = InferUITool<typeof gitCommitTool>
export type GitLogUITool = InferUITool<typeof gitLogTool>
export type GitBranchUITool = InferUITool<typeof gitBranchTool>
export type GitStashUITool = InferUITool<typeof gitStashTool>
export type GitConfigUITool = InferUITool<typeof gitConfigTool>
export type RandomGeneratorUITool = InferUITool<typeof randomGeneratorTool>
export type LeafletUITool = InferUITool<typeof leafletTool>
export type WalmartSearchUITool = InferUITool<typeof walmartSearchTool>
export type EbaySearchUITool = InferUITool<typeof ebaySearchTool>
export type SpatialIndexUITool = InferUITool<typeof spatialIndexTool>
export type StooqStockQuotesUITool = InferUITool<typeof stooqStockQuotesTool>
export type IchimokuCloudUITool = InferUITool<typeof ichimokuCloudTool>
export type FibonacciUITool = InferUITool<typeof fibonacciTool>
export type PivotPointsUITool = InferUITool<typeof pivotPointsTool>
export type TrendAnalysisUITool = InferUITool<typeof trendAnalysisTool>
export type MomentumAnalysisUITool = InferUITool<typeof momentumAnalysisTool>
export type VolatilityAnalysisUITool = InferUITool<typeof volatilityAnalysisTool>
export type VolumeAnalysisUITool = InferUITool<typeof volumeAnalysisTool>
export type StatisticalAnalysisUITool = InferUITool<typeof statisticalAnalysisTool>
export type HeikinAshiUITool = InferUITool<typeof heikinAshiTool>
export type MarketSummaryUITool = InferUITool<typeof marketSummaryTool>
export type CandlestickPatternUITool = InferUITool<typeof candlestickPatternTool>
export type TechnicalAnalysisUITool = InferUITool<typeof technicalAnalysisTool>
export type TextAnalysisUITool = InferUITool<typeof textAnalysisTool>
export type TextProcessingUITool = InferUITool<typeof textProcessingTool>
export type UrlValidationUITool = InferUITool<typeof urlValidationTool>
export type UrlManipulationUITool = InferUITool<typeof urlManipulationTool>
