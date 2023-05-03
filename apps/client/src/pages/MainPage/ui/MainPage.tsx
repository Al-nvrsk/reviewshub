import { trpc } from "@/shared/hooks/trpc/trpc"
import React, { useEffect, useState } from "react"
import { getTheme } from "@/features/ThemeSwitcher";
import { Card } from "@/entities/Card";
import { getSetReviewsState } from "@/entities/Review/model/selectors/getSetReviewsState";
import { getReviewsState } from "@/entities/Review/model/selectors/getReviewsState";
import cls from './MainPage.module.scss'
import { TagCloud, getSelectedTags } from "@/entities/TagCloud";
import { useTranslation } from "react-i18next";
import { SearchFilter, getCurrentMenuKey, getPart, getSearchText, getSearchWorkType, getSetPart } from "@/features/SearchFilter";
import { Empty, Spin } from "antd";
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { limit } from "../model/consts/limit";
import { MenuItemKey } from "common-types";
import { differenceBy } from 'lodash'

const MainPage = () => {
    const part = getPart()
    const setPart = getSetPart()
    const {t} = useTranslation()
    const theme = getTheme() 
    const reviews = getReviewsState() 
    const setReviews = getSetReviewsState()
    const selectedTags = getSelectedTags()
    const currentMenuKey = getCurrentMenuKey() 
    const searchText = getSearchText()
    const searchWorkType = getSearchWorkType()
    const [ishasNextPage, setIshasNextPage] = useState(true)
    const [isRendered, setIsRendered] = useState(false);

    const getReviews = trpc.getSearchedReviews.useQuery({
        limit,
        part,
        search: currentMenuKey,
        workType: searchWorkType,
        tags: selectedTags,
        text: searchText
    }, {
        enabled: Boolean(!(currentMenuKey === MenuItemKey.SEARCH && !searchText.length)), 
        keepPreviousData: false,
    },)
    
    useEffect(() => {
        if (!isRendered) {
            setIsRendered(true);
            return
            }
        if (currentMenuKey===MenuItemKey.SEARCH && !searchText) {
                return
            }
        setPart(1)
        setReviews()
    }, [selectedTags, searchText, searchWorkType, currentMenuKey ])

    useEffect(() => {
        console.log('getReviews.data', getReviews.data)
        console.log('part', part)
        console.log('IshasNextPage', ishasNextPage)

        if (getReviews.data?.length === 0 && part>1) {
            setIshasNextPage(false) 
            return
        }
        if (!getReviews.data) {
            return }
            part === 1
                ? (setReviews(getReviews.data),
                    setIshasNextPage(true) )
                : setReviews([...reviews,...differenceBy(getReviews.data, reviews, 'id')])
    }, [getReviews.data])

    const onLoadMore = () => {
        setPart(part+1)
    }

    const [infiniteRef] = useInfiniteScroll({
        loading: getReviews.isLoading,
        hasNextPage: ishasNextPage,
        onLoadMore: onLoadMore,
        disabled: !!getReviews?.error,
        rootMargin: '0px 0px 100px 0px',
    });

    return (
        <div className={cls.MainPage} >
            <SearchFilter />
            <TagCloud theme={theme} />
            <div className={cls.cardList}>
                {reviews?.length === 0  && <Empty description={t('No reviews')} />}
                {reviews?.map(review => (
                    <Card key={review.id} {...review} />
                )) }
            </div> 
            {ishasNextPage && (
                <div ref={infiniteRef}>
                    < Spin size="large" />
                </div>
            )}  
        </div>
    )
}

export default MainPage
