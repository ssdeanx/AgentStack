import type { InferUITool } from "@mastra/core/tools";
import type {
    activeDistTag,
    addIssueComment,
    alphaVantageCryptoTool,
    alphaVantageStockTool,
    alphaVantageTool,
    amazonSearchTool,
    apiDataFetcherTool,
    archiveDataTool,
    arxivPaperDownloaderTool,
    arxivPdfParserTool,
    arxivTool,
    backupDataTool,
    batchWebScraperTool,
    browserTool,
    chartDataProcessorTool,
    chartGeneratorTool,
    chartSupervisorTool,
    chartTypeAdvisorTool,
    checkFileExists,
    clickAndExtractTool,
    codeAnalysisTool,
    codeChunkerTool,
    codeSearchTool,
    colorChangeTool,
    contentCleanerTool,
    convertDataFormatTool,
    copyDataFileTool,
    copywriterTool,
    createDataDirTool,
    createDirectory,
    createIssue,
    createPullRequest,
    createRelease,
    createSandbox,
    csvToExcalidrawTool,
    csvToJsonTool,
    dataExporterTool,
    dataValidatorToolJSON,
    deleteDataFileTool,
    deleteFile,
    diffReviewTool,
    documentRerankerTool,
    ebaySearchTool,
    editorTool,
    evaluateResultTool,
    excalidrawToSVGTool,
    execaTool,
    extractLearningsTool,
    extractTablesTool,
    fillFormTool,
    findFreeSlots,
    findReferencesTool,
    findSymbolTool,
    finnhubAnalysisTool,
    finnhubCompanyTool,
    finnhubEconomicTool,
    finnhubFinancialsTool,
    finnhubQuotesTool,
    finnhubTechnicalTool,
    fsTool,
    getDataFileInfoTool,
    getFileContent,
    getFileInfo,
    getFileSize,
    getIssue,
    getPullRequest,
    getRepoFileTree,
    getRepositoryInfo,
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
    htmlToMarkdownTool,
    imageToCSVTool,
    jsonToCsvTool,
    jwtAuthTool,
    linkExtractorTool,
    listCommits,
    listDataDirTool,
    listEvents,
    listFiles,
    listIssues,
    listPullRequests,
    listRepositories,
    listScrapedContentTool,
    mastraChunker,
    mdocumentChunker,
    mergePullRequest,
    monitorPageTool,
    moveDataFileTool,
    multiStringEditTool,
    pdfGeneratorTool,
    pdfToMarkdownTool,
    pnpmBuild,
    pnpmChangesetPublish,
    pnpmChangesetStatus,
    pnpmRun,
    polygonCryptoAggregatesTool,
    polygonCryptoQuotesTool,
    polygonCryptoSnapshotsTool,
    polygonStockAggregatesTool,
    polygonStockFundamentalsTool,
    polygonStockQuotesTool,
    processSVGTool,
    processXMLTool,
    readCSVDataTool,
    readDataFileTool,
    readFile,
    readPDF,
    removeDataDirTool,
    runCode,
    runCommand,
    scrapingSchedulerTool,
    screenshotTool,
    searchCode,
    searchDataFilesTool,
    siteMapExtractorTool,
    svgToExcalidrawTool,
    testGeneratorTool,
    validateDataTool,
    validateExcalidrawTool,
    walmartSearchTool,
    watchDirectory,
    weatherTool,
    webScraperTool,
    writeDataFileTool,
    writeFile,
    writeFiles,
    writeNoteTool,
    yelpSearchTool,
} from "@/src/mastra/tools";

export type ActiveDistTagUITool = InferUITool<typeof activeDistTag>;
export type AddIssueCommentUITool = InferUITool<typeof addIssueComment>;
export type AlphaVantageCryptoUITool = InferUITool<typeof alphaVantageCryptoTool>;
export type AlphaVantageStockUITool = InferUITool<typeof alphaVantageStockTool>;
export type AlphaVantageUITool = InferUITool<typeof alphaVantageTool>;
export type AmazonSearchUITool = InferUITool<typeof amazonSearchTool>;
export type ApiDataFetcherUITool = InferUITool<typeof apiDataFetcherTool>;
export type ArchiveDataUITool = InferUITool<typeof archiveDataTool>;
export type ArxivPaperDownloaderUITool = InferUITool<typeof arxivPaperDownloaderTool>;
export type ArxivPdfParserUITool = InferUITool<typeof arxivPdfParserTool>;
export type ArxivUITool = InferUITool<typeof arxivTool>;
export type BackupDataUITool = InferUITool<typeof backupDataTool>;
export type BatchWebScraperUITool = InferUITool<typeof batchWebScraperTool>;
export type BrowserUITool = InferUITool<typeof browserTool>;
export type ChartDataProcessorUITool = InferUITool<typeof chartDataProcessorTool>;
export type ChartGeneratorUITool = InferUITool<typeof chartGeneratorTool>;
export type ChartSupervisorUITool = InferUITool<typeof chartSupervisorTool>;
export type ChartTypeAdvisorUITool = InferUITool<typeof chartTypeAdvisorTool>;
export type CheckFileExistsUITool = InferUITool<typeof checkFileExists>;
export type ClickAndExtractUITool = InferUITool<typeof clickAndExtractTool>;
export type CodeAnalysisUITool = InferUITool<typeof codeAnalysisTool>;
export type CodeChunkerUITool = InferUITool<typeof codeChunkerTool>;
export type CodeSearchUITool = InferUITool<typeof codeSearchTool>;
export type ColorChangeUITool = InferUITool<typeof colorChangeTool>;
export type ContentCleanerUITool = InferUITool<typeof contentCleanerTool>;
export type ConvertDataFormatUITool = InferUITool<typeof convertDataFormatTool>;
export type CopyDataFileUITool = InferUITool<typeof copyDataFileTool>;
export type CopywriterUITool = InferUITool<typeof copywriterTool>;
export type CreateDataDirUITool = InferUITool<typeof createDataDirTool>;
export type CreateDirectoryUITool = InferUITool<typeof createDirectory>;
export type CreateIssueUITool = InferUITool<typeof createIssue>;
export type CreatePullRequestUITool = InferUITool<typeof createPullRequest>;
export type CreateReleaseUITool = InferUITool<typeof createRelease>;
export type CreateSandboxUITool = InferUITool<typeof createSandbox>;
export type CsvToExcalidrawUITool = InferUITool<typeof csvToExcalidrawTool>;
export type CsvToJsonUITool = InferUITool<typeof csvToJsonTool>;
export type DataExporterUITool = InferUITool<typeof dataExporterTool>;
export type DataValidatorToolJSONUITool = InferUITool<typeof dataValidatorToolJSON>;
export type DeleteDataFileUITool = InferUITool<typeof deleteDataFileTool>;
export type DeleteFileUITool = InferUITool<typeof deleteFile>;
export type DiffReviewUITool = InferUITool<typeof diffReviewTool>;
export type DocumentRerankerUITool = InferUITool<typeof documentRerankerTool>;
export type EbaySearchUITool = InferUITool<typeof ebaySearchTool>;
export type EditorUITool = InferUITool<typeof editorTool>;
export type EvaluateResultUITool = InferUITool<typeof evaluateResultTool>;
export type ExcalidrawToSVGUITool = InferUITool<typeof excalidrawToSVGTool>;
export type ExecaUITool = InferUITool<typeof execaTool>;
export type ExtractLearningsUITool = InferUITool<typeof extractLearningsTool>;
export type ExtractTablesUITool = InferUITool<typeof extractTablesTool>;
export type FillFormUITool = InferUITool<typeof fillFormTool>;
export type FindFreeSlotsUITool = InferUITool<typeof findFreeSlots>;
export type FindReferencesUITool = InferUITool<typeof findReferencesTool>;
export type FindSymbolUITool = InferUITool<typeof findSymbolTool>;
export type FinnhubAnalysisUITool = InferUITool<typeof finnhubAnalysisTool>;
export type FinnhubCompanyUITool = InferUITool<typeof finnhubCompanyTool>;
export type FinnhubEconomicUITool = InferUITool<typeof finnhubEconomicTool>;
export type FinnhubFinancialsUITool = InferUITool<typeof finnhubFinancialsTool>;
export type FinnhubQuotesUITool = InferUITool<typeof finnhubQuotesTool>;
export type FinnhubTechnicalUITool = InferUITool<typeof finnhubTechnicalTool>;
export type FsUITool = InferUITool<typeof fsTool>;
export type GetDataFileInfoUITool = InferUITool<typeof getDataFileInfoTool>;
export type GetFileContentUITool = InferUITool<typeof getFileContent>;
export type GetFileInfoUITool = InferUITool<typeof getFileInfo>;
export type GetFileSizeUITool = InferUITool<typeof getFileSize>;
export type GetIssueUITool = InferUITool<typeof getIssue>;
export type GetPullRequestUITool = InferUITool<typeof getPullRequest>;
export type GetRepoFileTreeUITool = InferUITool<typeof getRepoFileTree>;
export type GetRepositoryInfoUITool = InferUITool<typeof getRepositoryInfo>;
export type GetTodayEventsUITool = InferUITool<typeof getTodayEvents>;
export type GetUpcomingEventsUITool = InferUITool<typeof getUpcomingEvents>;
export type GoogleAiOverviewUITool = InferUITool<typeof googleAiOverviewTool>;
export type GoogleAutocompleteUITool = InferUITool<typeof googleAutocompleteTool>;
export type GoogleFinanceUITool = InferUITool<typeof googleFinanceTool>;
export type GoogleNewsLiteUITool = InferUITool<typeof googleNewsLiteTool>;
export type GoogleNewsUITool = InferUITool<typeof googleNewsTool>;
export type GoogleScholarUITool = InferUITool<typeof googleScholarTool>;
export type GoogleSearchUITool = InferUITool<typeof googleSearch>;
export type GoogleSearchToolUITool = InferUITool<typeof googleSearchTool>;
export type GoogleTrendsUITool = InferUITool<typeof googleTrendsTool>;
export type HomeDepotSearchUITool = InferUITool<typeof homeDepotSearchTool>;
export type HtmlToMarkdownUITool = InferUITool<typeof htmlToMarkdownTool>;
export type ImageToCSVUITool = InferUITool<typeof imageToCSVTool>;
export type JsonToCsvUITool = InferUITool<typeof jsonToCsvTool>;
export type JwtAuthUITool = InferUITool<typeof jwtAuthTool>;
export type LinkExtractorUITool = InferUITool<typeof linkExtractorTool>;
export type ListCommitsUITool = InferUITool<typeof listCommits>;
export type ListDataDirUITool = InferUITool<typeof listDataDirTool>;
export type ListEventsUITool = InferUITool<typeof listEvents>;
export type ListFilesUITool = InferUITool<typeof listFiles>;
export type ListIssuesUITool = InferUITool<typeof listIssues>;
export type ListPullRequestsUITool = InferUITool<typeof listPullRequests>;
export type ListRepositoriesUITool = InferUITool<typeof listRepositories>;
export type ListScrapedContentUITool = InferUITool<typeof listScrapedContentTool>;
export type MastraChunkerUITool = InferUITool<typeof mastraChunker>;
export type MdocumentChunkerUITool = InferUITool<typeof mdocumentChunker>;
export type MergePullRequestUITool = InferUITool<typeof mergePullRequest>;
export type MonitorPageUITool = InferUITool<typeof monitorPageTool>;
export type MoveDataFileUITool = InferUITool<typeof moveDataFileTool>;
export type MultiStringEditUITool = InferUITool<typeof multiStringEditTool>;
export type PdfGeneratorUITool = InferUITool<typeof pdfGeneratorTool>;
export type PdfToMarkdownUITool = InferUITool<typeof pdfToMarkdownTool>;
export type PnpmBuildUITool = InferUITool<typeof pnpmBuild>;
export type PnpmChangesetPublishUITool = InferUITool<typeof pnpmChangesetPublish>;
export type PnpmChangesetStatusUITool = InferUITool<typeof pnpmChangesetStatus>;
export type PnpmRunUITool = InferUITool<typeof pnpmRun>;
export type PolygonCryptoAggregatesUITool = InferUITool<typeof polygonCryptoAggregatesTool>;
export type PolygonCryptoQuotesUITool = InferUITool<typeof polygonCryptoQuotesTool>;
export type PolygonCryptoSnapshotsUITool = InferUITool<typeof polygonCryptoSnapshotsTool>;
export type PolygonStockAggregatesUITool = InferUITool<typeof polygonStockAggregatesTool>;
export type PolygonStockFundamentalsUITool = InferUITool<typeof polygonStockFundamentalsTool>;
export type PolygonStockQuotesUITool = InferUITool<typeof polygonStockQuotesTool>;
export type ProcessSVGUITool = InferUITool<typeof processSVGTool>;
export type ProcessXMLUITool = InferUITool<typeof processXMLTool>;
export type ReadCSVDataUITool = InferUITool<typeof readCSVDataTool>;
export type ReadDataFileUITool = InferUITool<typeof readDataFileTool>;
export type ReadFileUITool = InferUITool<typeof readFile>;
export type ReadPDFUITool = InferUITool<typeof readPDF>;
export type RemoveDataDirUITool = InferUITool<typeof removeDataDirTool>;
export type RunCodeUITool = InferUITool<typeof runCode>;
export type RunCommandUITool = InferUITool<typeof runCommand>;
export type ScrapingSchedulerUITool = InferUITool<typeof scrapingSchedulerTool>;
export type ScreenshotUITool = InferUITool<typeof screenshotTool>;
export type SearchCodeUITool = InferUITool<typeof searchCode>;
export type SearchDataFilesUITool = InferUITool<typeof searchDataFilesTool>;
export type SiteMapExtractorUITool = InferUITool<typeof siteMapExtractorTool>;
export type SvgToExcalidrawUITool = InferUITool<typeof svgToExcalidrawTool>;
export type TestGeneratorUITool = InferUITool<typeof testGeneratorTool>;
export type ValidateDataUITool = InferUITool<typeof validateDataTool>;
export type ValidateExcalidrawUITool = InferUITool<typeof validateExcalidrawTool>;
export type WalmartSearchUITool = InferUITool<typeof walmartSearchTool>;
export type WatchDirectoryUITool = InferUITool<typeof watchDirectory>;
export type WeatherUITool = InferUITool<typeof weatherTool>;
export type WebScraperUITool = InferUITool<typeof webScraperTool>;
export type WriteDataFileUITool = InferUITool<typeof writeDataFileTool>;
export type WriteFileUITool = InferUITool<typeof writeFile>;
export type WriteFilesUITool = InferUITool<typeof writeFiles>;
export type WriteNoteUITool = InferUITool<typeof writeNoteTool>;
export type YelpSearchUITool = InferUITool<typeof yelpSearchTool>;

