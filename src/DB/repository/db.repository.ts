import { Model, FilterQuery, UpdateQuery, CreateOptions, HydratedDocument, RootFilterQuery, ProjectionType, QueryOptions, FlattenMaps, PopulateOptions, MongooseUpdateQueryOptions, QueryWithHelpers, UpdateWriteOpResult, Types, DeleteResult } from "mongoose";
import { BadRequestException } from "../../utils/response/error.response";

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

    async updateOne({
        filter,
        data,
        options,
    }: {
        filter: RootFilterQuery<TDocument>;
        data: UpdateQuery<TDocument>;
        options?: MongooseUpdateQueryOptions<TDocument> | null;
    }): Promise<UpdateWriteOpResult> {
        return await this.model.updateOne(filter, data, options);
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

    async deleteOne({
        filter,
    }: {
        filter: RootFilterQuery<TDocument>;
    }): Promise<DeleteResult> {
        return this.model.deleteOne(filter);
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
