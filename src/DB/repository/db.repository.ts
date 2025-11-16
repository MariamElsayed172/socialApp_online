import { Model, FilterQuery, UpdateQuery, CreateOptions, HydratedDocument, RootFilterQuery, ProjectionType, QueryOptions, FlattenMaps, PopulateOptions, MongooseUpdateQueryOptions, UpdateWriteOpResult, Types, DeleteResult } from "mongoose";

export type Lean<T> = HydratedDocument<FlattenMaps<T>>
export abstract class DBRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) { }

    async create({
        data,
        options,
    }: {
        data: Partial<TDocument>[];
        options?: CreateOptions | undefined;
    }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options);
    };

    async insertMany({
        data,
    }: {
        data: Partial<TDocument>[];
    }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return (await this.model.insertMany(data)) as HydratedDocument<TDocument>[];
    };

    async findOne({
        filter,
        select,
        options
    }: {
        filter?: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument> | null;
        options?: QueryOptions<TDocument> | null;

    }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        const doc = this.model.findOne(filter).select(select || "")
        if (options?.populate) {
            doc.populate(options.populate as PopulateOptions[]);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    };

    async findById({
        id,
        select,
        options
    }: {
        id?: any;
        select?: ProjectionType<TDocument> | null;
        options?: QueryOptions<TDocument> | null;

    }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        const doc = this.model.findById(id).select(select || "")
        if (options?.populate) {
            doc.populate(options.populate as PopulateOptions[]);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    };

    async find({
        filter,
        select,
        options
    }: {
        filter?: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument> | undefined;
        options?: QueryOptions<TDocument> | undefined;

    }): Promise<HydratedDocument<TDocument>[] | [] | Lean<TDocument>[]> {
        const doc = this.model.find(filter || {}).select(select || "")
        if (options?.populate) {
            doc.populate(options.populate as PopulateOptions[]);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        if (options?.skip) {
            doc.skip(options.skip);
        }
        if (options?.limit) {
            doc.limit(options.limit);
        }
        return await doc.exec();
    };

    async paginate({
        filter = {},
        select,
        options = {},
        page = "all",
        size = 5
    }: {
        filter: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument> | undefined;
        options?: QueryOptions<TDocument> | undefined;
        page?: number | "all";
        size?: number;

    }): Promise<HydratedDocument<TDocument>[] | [] | Lean<TDocument>[] | any> {
        let docsCount: number | undefined = undefined;
        let pages: number | undefined = undefined;
        if (page !== "all") {
            page = Math.floor(page < 1 ? 1 : page);
            options.limit = Math.floor(size < 1 || !size ? 5 : size);
            options.skip = (page - 1) * options.limit;

            docsCount = await this.model.countDocuments(filter);
            pages = Math.ceil(docsCount / options.limit);
        }
        const result = await this.find({ filter, select, options });
        return { docsCount, limit: options.limit, pages, currentPage: page !== "all" ? page : undefined, result };
    };

    async updateOne({
        filter,
        data,
        options,
    }: {
        filter: RootFilterQuery<TDocument>;
        data: UpdateQuery<TDocument>;
        options?: MongooseUpdateQueryOptions<TDocument> | null;
    }): Promise<UpdateWriteOpResult> {
        if (Array.isArray(data)) {
            data.push({
                $set: { __v: { $add: ["$__v", 1] }, }
            })
            return await this.model.updateOne(filter || {}, data, options);
        }
        return await this.model.updateOne(filter || {}, { ...data, $inc: { __v: 1 } }, options);
    };

    async findByIdAndUpdate({
        id,
        update,
        options = { new: true },
    }: {
        id: Types.ObjectId;
        update?: UpdateQuery<TDocument>;
        options?: QueryOptions<TDocument> | null;
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return this.model.findByIdAndUpdate(
            id,
            { ...update, $inc: { __v: 1 } },
            options,
        )
    };

    async findOneAndUpdate({
        filter,
        update,
        options = { new: true },
    }: {
        filter?: RootFilterQuery<TDocument>;
        update?: UpdateQuery<TDocument>;
        options?: QueryOptions<TDocument> | null;
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return this.model.findOneAndUpdate(
            filter,
            { ...update, $inc: { __v: 1 } },
            options,
        )
    };

    async deleteOne({
        filter,
    }: {
        filter: RootFilterQuery<TDocument>;
    }): Promise<DeleteResult> {
        return this.model.deleteOne(filter);
    };

    async findOneAndDelete({
        filter,
    }: {
        filter: RootFilterQuery<TDocument>;
    }): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOneAndDelete(filter);
    };

    async deleteMany({
        filter,
    }: {
        filter: RootFilterQuery<TDocument>;
    }): Promise<DeleteResult> {
        return this.model.deleteMany(filter);
    };
}
// export const findOne = async <T>({
//     model,
//     filter = {},
//     select = "",
// }: {
//     model: Model<T>;
//     filter?: FilterQuery<T>;
//     select?: string;

// }): Promise<T | null> => {
//     return await model.findOne(filter).select(select);
// };

// findById
export const findById = async <T>({
    model,
    id,
    select = "",
}: {
    model: Model<T>;
    id: string;
    select?: string;

}): Promise<T | null> => {
    return await model.findById(id).select(select);
};

// create
// export const create = async <T>({
//     model,
//     data = [{} as T],
//     options = { validateBeforeSave: true },
// }: {
//     model: Model<T>;
//     data?: Partial<T>[];
//     options?: Record<string, any>;
// }): Promise<T[]> => {
//     return await model.create(data, options);
// };

// updateOne
// export const updateOne = async <T>({
//     model,
//     filter = {},
//     data = [{} as Partial<T>],
//     options = { runValidators: true },
// }: {
//     model: Model<T>;
//     filter?: FilterQuery<T>;
//     data?: UpdateQuery<T> | Partial<T>;
//     options?: Record<string, any>;
// }): Promise<any> => {
//     return await model.updateOne(filter, data, options);
// };

// findOneAndUpdate
export const findOneAndUpdate = async <T>({
    model,
    filter = {},
    data = {},
    select = "",
    options = { runValidators: true, new: true },
}: {
    model: Model<T>;
    filter?: FilterQuery<T>;
    data?: UpdateQuery<T> | Partial<T>;
    select?: string;
    options?: Record<string, any>;
}): Promise<T | null> => {
    return await model
        .findOneAndUpdate(
            filter,
            {
                ...data,
                $inc: { __v: 1 },
            },
            options
        )
        .select(select)
};



// deleteOne
export const deleteOne = async <T>({
    model,
    filter = {},
}: {
    model: Model<T>;
    filter?: FilterQuery<T>;
}): Promise<any> => {
    return await model.deleteOne(filter);
};
