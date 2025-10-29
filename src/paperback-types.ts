// Paperback v0.6 Types for XoXoComics Extension

export interface SourceInfo {
    version: string
    name: string
    icon: string
    author: string
    authorWebsite: string
    description: string
    websiteBaseURL: string
    sourceTags: Tag[]
}

export interface Tag {
    text: string
    type: TagType
}

export enum TagType {
    BLUE = 'blue',
    GREEN = 'green',
    GREY = 'grey',
    YELLOW = 'yellow',
    RED = 'red'
}

export interface Manga {
    id: string
    titles: string[]
    image: string
    status: MangaStatus
    author?: string
    artist?: string
    tags?: MangaTag[]
    desc?: string
}

export interface MangaTag {
    id: string
    label: string
}

export enum MangaStatus {
    ONGOING = 1,
    COMPLETED = 2,
    UNKNOWN = 0
}

export interface Chapter {
    id: string
    mangaId: string
    name: string
    langCode: string
    chapNum: number
    time: Date
}

export interface ChapterDetails {
    id: string
    mangaId: string
    pages: string[]
}

export interface SearchRequest {
    title?: string
    includedTags?: Tag[]
    excludedTags?: Tag[]
    status?: MangaStatus
    author?: string
    artist?: string
}

export interface PagedResults {
    results: Manga[]
    metadata: any
}

export interface HomeSection {
    id: string
    title: string
    items: Manga[]
    view_more?: boolean
}

export interface Request {
    url: string
    method: string
    headers: Record<string, string>
    data?: any
    param?: string
    cookies?: Cookie[]
}

export interface Cookie {
    name: string
    value: string
    domain?: string
    path?: string
}

export abstract class Source {
    constructor(public sourceInfo: SourceInfo) {}

    abstract getMangaDetails(mangaId: string): Promise<Manga>
    abstract getChapters(mangaId: string): Promise<Chapter[]>
    abstract getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails>
    abstract getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults>
    abstract getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void>
    abstract getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults>

    async requestModifier(request: Request): Promise<Request> {
        return request
    }
}