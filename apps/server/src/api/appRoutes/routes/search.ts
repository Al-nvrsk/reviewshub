import { router } from '../../trpc/trpc';
import { publicProcedure } from '../../procedure/procedure';
import { z as zod } from 'zod';
import { TRPCError } from '@trpc/server';
import { MenuItemKey } from 'common-files';
import { avgRate } from '../../utils/avgRate/avgRate';

export const searchRouter = router({

    getSearchedReviews: publicProcedure
        .input(zod.object({
            limit: zod.number().nullish(),
            part: zod.number().nullish(),
            workType: zod.string().optional(),
            search: zod.string(),
            tags: zod.array(zod.string()),
            text: zod.string().optional()
        }))
        .query(async req => {
            const { limit, part, workType, search, tags, text } = req.input;
            try {

                if (search === MenuItemKey.POPULAR) {
                    const getrate = await req.ctx.prisma.reviewRating.groupBy({
                        by: ['reviewId'],
                        where: {
                            review: {
                            TypeOfWork: workType ? {equals: workType} : {},
                            Tags: tags?.length > 0 ? {some: {tag: {in: tags}}} : {}
                            }
                        },
                        skip: limit! * (part! - 1),
                        take: limit!,
                        orderBy: {
                            _avg: {
                                userRate: 'desc'
                            }
                        }
                        });
                    const getReviews = await req.ctx.prisma.reviews.findMany({
                        where:{id: {in: getrate.map(review => review.reviewId)}},
                        include: {
                            Tags: {select: {tag: true}},
                            rating: true
                        }
                    })

                    const reviewsWithAvgRate = avgRate(getReviews)
                    return reviewsWithAvgRate.sort((prev, current) => current.rating - prev.rating )
                }

                if (search === MenuItemKey.ADDED) {
                    const getReviews = await req.ctx.prisma.reviews.findMany({
                        skip: limit!*(part!-1),
                        take: limit!,
                        where: {
                                TypeOfWork: workType ? {equals: workType} : {},
                                Tags: tags?.length>0 ? { some: { tag: {in : tags} } } : {}
                            },
                        orderBy: {
                            createdAt: 'desc'
                            },
                        include: {
                            Tags: {select: {tag: true}},
                            rating: true
                            }
                    })
                    const reviewsWithAvgRate = avgRate(getReviews)
                return reviewsWithAvgRate
                }

                if (search === MenuItemKey.SEARCH ) {
                    if (!text) { 
                        return 
                    } 
                    const searchReviewText = await req.ctx.prisma.reviews.findMany({
                        skip: limit!*(part!-1),
                        take: limit!, 
                        where: { TypeOfWork: workType ? {equals: workType} : {},
                                    Tags: tags?.length>0 ? {some: {tag: {in: tags}}}: {},
                            OR:[ { ReviewText: { search: text } }, 
                                { ReviewName: { search: text } },
                                { TitleOfWork: { search: text } },
                                { TypeOfWork: { search: text } },
                                { comments: { some: {text: { search: text}} }},
                                { author: { OR: [
                                    {firstName : { search: text }},
                                    {secondName : { search: text}},
                                    {login: { search: text}}
                                ]
                                }},
                                { Tags: {some : { tag: { search: text}}}}
                            ] 
                        },
                        include: {
                            Tags: {select: {tag: true}},
                            rating: true,
                        },
                        distinct: ['id']
                    })
                    const searchedReview = avgRate(searchReviewText)
                return searchedReview
            }
            throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected request',
            })

        }catch(e) {
            console.log(e)
        }
    })
})
