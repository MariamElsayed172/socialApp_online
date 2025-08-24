import { Model, FilterQuery, UpdateQuery } from "mongoose";


export const findOne = async <T>({
    model,
    filter = {},
    select = "",
}: {
    model: Model<T>;
    filter?: FilterQuery<T>;
    select?: string;

}): Promise<T | null> => {
    return await model.findOne(filter).select(select);
};

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
export const create = async <T>({
    model,
    data = [{} as T],
    options = { validateBeforeSave: true },
}: {
    model: Model<T>;
    data?: Partial<T>[];
    options?: Record<string, any>;
}): Promise<T[]> => {
    return await model.create(data, options);
};

// updateOne
export const updateOne = async <T>({
    model,
    filter = {},
    data = [{} as Partial<T>],
    options = { runValidators: true },
}: {
    model: Model<T>;
    filter?: FilterQuery<T>;
    data?: UpdateQuery<T> | Partial<T>;
    options?: Record<string, any>;
}): Promise<any> => {
    return await model.updateOne(filter, data, options);
};

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
